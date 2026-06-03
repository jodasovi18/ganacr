# Diseño — Modernización de la suite E2E con Firebase Emulator

**Fecha:** 2026-06-02
**Tipo:** Infraestructura de testing
**Estado:** Aprobado (pendiente review del spec → writing-plans)

## Resumen

Reemplazar las suites Playwright actuales (`tests/qa/`, `tests/responsive/`) —que usan
**selectores pre-migración shadcn/Tailwind** y **no corren** contra el build actual— por una
suite E2E **determinista** sobre **Firebase Emulator (Firestore + Auth)** con datos sembrados.
El emulador no aplica App Check, así que la automatización **sí carga datos** (hoy bloqueada por
App Check en backend). Cobertura de **ruta crítica** en browser + **cálculos y render de PDF**
como tests Node rápidos.

## Contexto / problema

- Las suites actuales referencian clases que ya no existen (`.lote-card`, `.pdf-dropdown`,
  `.detalle-acciones`, `.finca-selector-chip`, `button "📄 PDF"`, etc.) — ~102 ocurrencias en
  ~11 specs. No corren verde contra el rediseño shadcn.
- **App Check (reCAPTCHA v3) está enforced en el backend de Firestore.** Un navegador
  automatizado (headless o no) obtiene 403 → `permission-denied`, por lo que en localhost/prod
  la automatización solo ve el estado **onboarding/vacío** (sin datos). Verificado en esta sesión.
- `src/services/firebase.ts` inicializa App Check **solo en PROD** (`import.meta.env.PROD`); en
  dev el cliente no manda token, pero el backend igual deniega.

## Decisiones (tomadas en brainstorming)

1. **Backend de datos:** Firebase **Emulator** (Firestore + Auth) con seed. (No debug token, no
   acoplar tests al demo/prod.)
2. **Alcance:** **ruta crítica** en E2E + mover **cálculos** y **render de PDF** a tests Node
   rápidos. Se descartan/fusionan specs redundantes.
3. **CI:** **local primero**; GitHub Actions queda como follow-up dedicado (fuera de alcance).
4. **Java:** el usuario instala **JDK 17** (el emulador requiere Java 11+; hoy hay Java 8).

## Entorno verificado

- Node real del proyecto: **v22.18.0** (apto para firebase-tools v15 y emulador).
- ⚠️ Existe un paquete `node` parásito que ensombrece vía `npx`/`npm exec` (resuelve a Node v8).
  Mitigación: invocar `firebase-tools` **como devDependency dentro de scripts `npm run`** (corren
  con Node 22), no por `npx` global.
- Java actual: **1.8** → el usuario instalará **JDK 17**. El emulador no arranca con Java 8.

## Arquitectura

### A. Configuración del emulador
- `firebase.json`: agregar bloque `emulators`:
  - `firestore` → puerto **8080**
  - `auth` → puerto **9099**
  - `ui` → deshabilitada (`"ui": { "enabled": false }`) para CI/headless.
  - `singleProjectMode: true`.

### B. La app se conecta al emulador en modo test
- `src/services/firebase.ts`: tras `initializeFirestore`/`getAuth`, si
  `import.meta.env.VITE_USE_EMULATOR === 'true'`:
  - `connectFirestoreEmulator(db, 'localhost', 8080)`
  - `connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })`
  - Llamadas **antes** de cualquier uso de Firestore (a nivel de módulo).
  - **Guardado por el flag** → prod y `npm run dev` normal quedan intactos; App Check sigue
    PROD-only y nunca corre en modo emulador.
- `.env.test` (commiteado, **sin secretos**): `VITE_USE_EMULATOR=true`.
- Vite corre con `--mode test` (carga `.env.test`).

### C. Seed del emulador
- `scripts/seed-emulator.ts` (adaptado de `scripts/seed.ts`):
  - Inicializa **firebase-admin** con `projectId: 'ganacr'` y las env
    `FIRESTORE_EMULATOR_HOST=localhost:8080`, `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
    → el Admin SDK apunta al emulador (**sin service-account.json**).
  - Crea en **Auth emulator** un usuario de test con **UID fijo** (ej. `test-user-e2e`) y
    credenciales conocidas (ej. `e2e@ganacr.test` / `e2e-pass-123`).
  - Crea datos con `userId = test-user-e2e`:
    - **2 fincas**: "La Esperanza" y "El Roble".
    - **Lote PROPIO** con animales (orígenes variados: comprado/nacido/sin registro; algunos con
      `areteSenasa` y otros sin → para alertas/filtro), pesos y gastos.
    - **Lote A-MEDIAS** (socio con %), con animales (activo/vendido/muerto), pesos, gastos y
      **ventas** → ejercita venta+anular, muerte, reparto a-medias y **PDF socio**.
  - IDs y montos **deterministas** (constantes) para aserciones estables.
  - Las constantes compartidas (nombres de lote, aretes, UID, credenciales, montos clave) viven
    en `tests/e2e/fixtures.ts`; **`seed-emulator.ts` las importa** para sembrar y los specs las
    importan para aserciones (single source of truth).

### D. Orquestación
- `firebase-tools` como **devDependency** (versión reciente compatible con Node 22, v14+).
- `npm run test:e2e` = `firebase emulators:exec --only firestore,auth "playwright test"`.
  - `emulators:exec` levanta los emuladores, corre el comando y los **apaga al terminar**
    (sin emuladores colgados).
  - Playwright maneja el `webServer` (vite `--mode test --port 5174`) y un **globalSetup**
    (`tests/e2e/global-setup.ts`) que **resiembra fresco** (Admin SDK → emulador) en cada corrida.
- `npm run test:unit` = corre los tests Node (tsx).
- `npm run test` = `test:unit` + `test:e2e`.
- `npm run seed:emulator` = seed manual (para debug con `firebase emulators:start`).

### E. Estructura de archivos
```
playwright.config.ts          # consolidado: projects "desktop" (Desktop Chrome) y "mobile" (Pixel 5)
.env.test                     # VITE_USE_EMULATOR=true
firebase.json                 # + bloque emulators
scripts/seed-emulator.ts      # seed del emulador (Admin SDK)
tests/
  e2e/
    global-setup.ts           # resiembra antes de la corrida
    helpers.ts                # login() moderno + helpers (gotoLote, openLoteMenu, ...)
    fixtures.ts               # constantes compartidas con el seed
    auth.spec.ts
    lotes.spec.ts
    animales.spec.ts
    ventas.spec.ts
    mover.spec.ts
    gastos-finca.spec.ts
    muerte.spec.ts
    sanidad.spec.ts
    areteo-filtro.spec.ts
    responsive.spec.ts        # project "mobile": Dashboard + LoteDetalle CON datos
  unit/
    calculadora.test.ts       # cálculos puros (utilidad, reparto a-medias, proporcional)
    filtrar-animales.test.ts  # reubicado desde scripts/test-filtrar-animales.ts
    pdf-render.test.ts        # render Lote+Socio → %PDF- (blinda BUG-3)
```
- **Se eliminan** `tests/qa/` y `tests/responsive/` viejos (incluidos `playwright.responsive.config.ts`
  y los `screenshots/` con error-context obsoletos) tras migrar lo valioso.

### F. Selectores (helpers)
- `login(page)`: `input#email`, `input#password`, `button[type=submit]` ("Ingresar"), esperar
  un marcador del Dashboard (texto "ANIMALES" o el chip de finca).
- Preferir **`getByRole` / `getByText`** (robustos al estilo). Agregar `data-testid` **solo**
  donde role/text sea ambiguo (mínimo, documentado).

## Cobertura E2E (ruta crítica)

| Spec | Flujo |
|------|-------|
| `auth` | login; stats del Dashboard; selector multi-finca |
| `lotes` | crear propio + a-medias; editar; borrar con cascade |
| `animales` | agregar (3 orígenes, arete/DIIO); editar; borrar |
| `ventas` | vender N; utilidad/reparto; **anular** (revierte contadores) |
| `mover` | mover same-finca (contadores de ambos lotes) |
| `gastos-finca` | gasto de finca con distribución proporcional |
| `muerte` | registrar muerte (pérdida, aviso fiscal); revertir |
| `sanidad` | registrar evento sanitario; historial |
| `areteo-filtro` | alertas sin arete; filtro avanzado (estado/raza/origen/peso/ganancia) |
| `responsive` | (mobile) Dashboard + LoteDetalle **con datos**: navbar hamburguesa, stats 2×2, sin overflow horizontal |

### Tests Node (rápidos, deterministas)
- `calculadora.test.ts`: utilidad bruta, inversión, gastos proporcional, reparto socio/dueño.
- `filtrar-animales.test.ts`: reutiliza los casos existentes de `test-filtrar-animales.ts`.
- `pdf-render.test.ts`: `renderToBuffer(ReporteLotePDF)` y `renderToBuffer(ReporteSocioPDF)` con
  datos mock → assert `%PDF-` y sin throw (regresión permanente de BUG-3).
- Runner: `node --test` con loader tsx, o scripts tsx que lanzan en fallo (definir en el plan).

## Determinismo / aislamiento

- **Seed fresco por corrida** (globalSetup limpia + siembra).
- Specs **destructivos** crean sus propias entidades (ej. un lote "throwaway") o toleran orden,
  para no depender entre sí. `workers: 1` (ya es el default actual) para evitar carreras sobre
  el mismo dataset.
- Sin red, sin App Check, reproducible.

## Riesgos / mitigaciones

- **Java 11+**: requisito duro del emulador (usuario instala JDK 17). Sin esto, `test:e2e` falla
  con un error claro de emulador.
- **Shim Node v8** vía npx: mitigado usando firebase-tools como devDep dentro de `npm run`.
- **Primera corrida** descarga el binario del emulador (~decenas de MB).
- **`connectFirestoreEmulator` + `persistentLocalCache`**: compatible; la conexión al emulador se
  hace a nivel de módulo antes de cualquier lectura.

## Fuera de alcance (YAGNI)

- **CI / GitHub Actions** (follow-up dedicado).
- **Emulador de Storage** (la app no usa Storage).
- **Emular App Check** (el emulador lo bypassa por diseño).
- Reescribir el 100% de las aserciones viejas — se migra lo valioso, no 1:1.

## Entregable

- Suite que corre verde localmente: `npm run test:e2e` (con Java 17) y `npm run test:unit`.
- Specs nuevos en `tests/e2e/` + tests Node en `tests/unit/`.
- Infra: `firebase.json` (emulators), `.env.test`, `seed-emulator.ts`, `playwright.config.ts`
  consolidado, scripts en `package.json`, firebase-tools devDep.
- Suites viejas eliminadas.
- PR dedicado (rama `test/modernizar-suite-e2e`).
