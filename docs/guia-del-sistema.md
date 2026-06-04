# GanaCR — Guía del sistema

> **Documento de referencia.** Explica qué es GanaCR, cómo está construido y cómo funciona cada
> pieza. Está organizado **en capas**: la **Parte I** es una visión general en lenguaje claro (la
> puede leer cualquiera); de la **Parte II** en adelante baja al detalle técnico (arquitectura,
> offline-first, seguridad, respaldos, testing).
>
> Última actualización: 4 jun 2026.

---

## Índice

- **Parte I — Visión general** (lenguaje claro)
- **Parte II — Arquitectura técnica** (stack, carpetas, modelo de datos)
- **Parte III — Módulos funcionales** (qué hace cada feature)
- **Parte IV — Offline-first** (funcionar sin señal)
- **Parte V — Seguridad de los datos**
- **Parte VI — Respaldo y recuperación (DR)**
- **Parte VII — Pruebas automatizadas**
- **Parte VIII — Flujo de trabajo y despliegue**
- **Parte IX — Estado actual y hoja de ruta**
- **Apéndices — Comandos y glosario**

---

# Parte I — Visión general

## ¿Qué es GanaCR?

GanaCR es un **sistema web de gestión ganadera para Costa Rica**, enfocado en **engorde** (compra de
animales, los engordo, los vendo). Le permite a un ganadero llevar el control digital de:

- sus **fincas** y los **lotes** de ganado dentro de cada una,
- cada **animal** (arete, raza, peso, precio, origen, arete oficial SENASA),
- los **pesajes** a lo largo del tiempo,
- los **gastos** (alimento, veterinario, mano de obra, transporte),
- las **ventas**, con el cálculo automático de la **utilidad**,
- y casos especiales como la **muerte** de un animal o la sociedad **"a medias"** con otra persona.

El objetivo a mediano plazo es que sea un **producto comercializable** para ganaderos
costarricenses, con módulos que respondan a la legislación vigente (SENASA, y más adelante SUGEF y
líneas de crédito del MAG).

## El problema que resuelve

El ganadero promedio lleva las cuentas en papel, en la cabeza o en hojas de Excel sueltas. Eso hace
difícil saber lo más importante: **¿estoy ganando o perdiendo plata con este lote?** GanaCR
responde eso automáticamente, y además resuelve dos realidades del campo costarricense:

1. **Conectividad limitada.** En muchas zonas rurales no hay señal. Por eso GanaCR es
   **offline-first**: funciona sin internet y sincroniza cuando vuelve la conexión (ver Parte IV).
2. **Cumplimiento legal creciente.** SENASA exige areteo oficial y registro; GanaCR ya incorpora el
   arete oficial (DIIO) y avisa de animales sin registrar (ver Parte III y IX).

## Decisiones clave (el "porqué")

| Decisión | Por qué |
|---|---|
| **Offline-first** | Las zonas ganaderas de CR tienen mala señal. La app tiene que servir igual. |
| **Multi-finca** | Un ganadero suele tener más de una finca; los datos se separan por finca. |
| **Ganado "a medias"** | Es común ser socio de un animal con otra persona; el sistema reparte la utilidad según el porcentaje pactado. |
| **Seguridad por usuario** | Cada usuario solo ve y toca **sus** datos; las reglas del servidor lo garantizan (Parte V). |
| **Respaldos off-cloud** | Seguro ante el caso extremo de que la nube falle: los datos se pueden exportar y restaurar (Parte VI). |
| **Todo probado** | Cada flujo crítico tiene pruebas automáticas que corren antes de publicar (Parte VII). |

## Qué hace hoy, en una frase

Hoy GanaCR cubre **todo el ciclo de engorde** (finca → lote → animales → pesajes → gastos →
venta/muerte → utilidad), con **multi-finca**, **sanidad**, **areteo SENASA**, **análisis de
rentabilidad**, un **simulador de "vender hoy vs. esperar"**, exportación a **Excel y PDF**,
funcionamiento **offline**, **seguridad endurecida** a nivel de base de datos y un **sistema de
respaldos** restaurable. El detalle está en las partes siguientes.

---

# Parte II — Arquitectura técnica

## Stack

- **Frontend:** React 18 + TypeScript + Vite 5.
- **Base de datos y autenticación:** Firebase — **Firestore** (base de datos de documentos) +
  **Firebase Auth** (login/registro). Se usa el SDK **modular de cliente** (v10).
- **Ruteo:** React Router DOM 6.
- **UI:** **Tailwind CSS v4** + **shadcn/ui**, con la paleta propia *"Campo Claro"* (verde bosque
  `#1e4d3a`). Diseño **mobile-first** y responsive.
- **Offline:** persistencia local de Firestore en **IndexedDB** (`persistentLocalCache`).
- **Exportación:** `react-pdf/renderer` (PDF de lotes y de socio) y `xlsx` (Excel de inventario,
  ventas y pérdidas).
- **Anti-bots:** **App Check** (reCAPTCHA v3) en producción.
- **Hosting:** **Vercel** (despliega automáticamente la rama `main`).

## Estructura de carpetas (lo esencial)

```
src/
  types/index.ts          ← todas las interfaces TypeScript (Animal, Lote, Venta, …)
  services/firebase.ts    ← configuración de Firebase + conexión al emulador en tests
  contexts/
    AuthContext.tsx       ← sesión del usuario
    FincaContext.tsx      ← finca activa + lista de fincas
  hooks/                  ← lógica de datos (useLotes, useAnimales, useVentas, …)
  utils/
    calculadora.ts        ← cálculos de venta + formato (₡, kg, fechas)
    finanzas.ts           ← núcleo de rentabilidad (Fase 4-A)
    simulador.ts          ← simulador vender hoy vs. esperar (Fase 4-B)
    exportExcel.ts        ← exportación a Excel
    exportPDF.ts          ← exportación a PDF
  pages/                  ← Dashboard, Login, LoteDetalle
  components/             ← modales y tabs (CrearLote, VenderAnimales, …)
    ui/                   ← componentes shadcn/ui (Button, Dialog, Tabs, …)
    svg/                  ← gráficos (AnimalWeightChart, LoteAvgChart)
    pdf/                  ← componentes react-pdf (ReporteLotePDF, ReporteSocioPDF)
  index.css               ← Tailwind v4 + tema + paleta Campo Claro

scripts/                  ← utilidades Node (tsx) con Firebase Admin SDK
tests/                    ← unit / e2e / rules / backup (ver Parte VII)
docs/                     ← esta guía, runbook de DR, specs y planes
firestore.rules           ← reglas de seguridad de la base de datos
firestore.indexes.json    ← índices compuestos (hoy vacío; se ordena en cliente)
firebase.json             ← configuración de Firebase + emuladores
```

## Modelo de datos (Firestore)

Firestore guarda **documentos** agrupados en **colecciones**. GanaCR tiene **9 colecciones**, con
esta jerarquía lógica:

```
usuario (users)
   └── finca (fincas)
         └── lote (lotes)
               ├── animal (animales)
               │     ├── peso (pesos)
               │     └── evento sanitario (eventosSanitarios)
               ├── gasto (gastos)            ← gasto del lote
               └── venta (ventas)
         └── gasto de finca (gastosFinca)    ← se reparte entre lotes
```

| Colección | Qué guarda |
|---|---|
| `users` | Perfil del usuario (clave = su UID de Auth). |
| `fincas` | Fincas del usuario (nivel más alto de la jerarquía). |
| `lotes` | Lotes de ganado, ligados a una finca. Acumulan **contadores** (totales). |
| `animales` | Animales individuales, ligados a un lote y una finca. |
| `pesos` | Historial de pesajes por animal. |
| `gastos` | Gastos de un lote. |
| `gastosFinca` | Gastos a nivel de finca, con distribución proporcional entre lotes. |
| `eventosSanitarios` | Vacunas y tratamientos por animal. |
| `ventas` | Ventas realizadas, con el cálculo de utilidad y el reparto a medias. |

**Dos convenciones importantes:**

1. **Cada documento lleva un campo `userId`** (excepto `users`, cuya *clave* ya es el UID). Es la
   base de la seguridad: las reglas solo dejan que cada quien toque documentos con su propio
   `userId` (Parte V).
2. **Los lotes acumulan contadores** (cantidad de animales, total invertido, total de gastos, total
   de ventas, utilidad) usando operaciones `increment()`. Así el dashboard no tiene que recalcular
   sumando miles de documentos cada vez.

## Contextos y hooks

- **`AuthContext`** mantiene la sesión (quién está logueado). **`FincaContext`** mantiene la **finca
  activa** y la lista de fincas; un selector en la barra superior permite cambiar de finca.
- Los **hooks** (`useLotes(fincaId)`, `useAnimales`, `usePesos`, `useGastos`, `useVentas`,
  `useFincas`, `useGastosFinca`, `useEventosSanitarios`, `useRegistrarMuerte`, `useAnularVenta`,
  `useAnimalesSinArete`, …) encapsulan **toda la lógica de leer y escribir datos**. Los componentes
  de pantalla no hablan con Firestore directamente: usan los hooks. Eso mantiene la UI simple y la
  lógica testeable.

---

# Parte III — Módulos funcionales

Cada módulo indica **qué hace** y **dónde vive** en el código.

### Autenticación
Login y registro con Firebase Auth. Al registrarse, un **onboarding** crea la primera finca.
*(AuthContext, Login.tsx.)*

### Dashboard
Pantalla principal con **estadísticas globales** de la finca activa y la lista de lotes (cada lote
con botones Ver / Editar / Eliminar). Tabs: **Lotes**, **Gastos de Finca**, **Finanzas**.
*(Dashboard.tsx.)*

### Multi-finca *(Fase 2A)*
Colección `fincas` como nivel superior; `fincaId` en lotes, animales, gastos y ventas. Selector de
finca activa en la barra. Permite **mover animales entre lotes** de la misma finca (con `writeBatch`
para que sea atómico) y registrar **gastos de finca** que se reparten **proporcionalmente** entre
los lotes. *(FincaContext, FincaSelector, MoverAnimalesModal, GastoFincaModal.)*

### Lotes
Un lote puede ser **propio** o **a medias** (sociedad con un socio y un porcentaje). CRUD completo
(crear, editar, eliminar). *(CrearLoteModal, LoteDetalle.tsx.)*

### Animales
Cada animal tiene arete interno, raza, peso, precio de compra, **origen** (comprado o nacido en
finca) y **arete oficial SENASA (DIIO)**. CRUD completo. **Filtro avanzado** por raza, estado, rango
de peso, origen y "sin arete SENASA". *(AgregarAnimalModal, AnimalesFilterBar, `filtrarAnimales`.)*

### Pesajes
Registro del peso de cada animal a lo largo del tiempo, con **gráficos de evolución** por animal y
el promedio del lote. *(RegistrarPesoModal, PesosTab, AnimalWeightChart, LoteAvgChart.)*

### Gastos
Gastos por lote (alimento, veterinario, mano de obra, transporte) y **gastos de finca** repartidos
entre lotes. *(AgregarGastoModal, GastosFincaTab.)*

### Ventas
Vender uno o varios animales calcula **automáticamente** la utilidad (precio de venta − inversión −
gastos) y, si el lote es a medias, **reparte** según el porcentaje del socio. Se puede **anular** una
venta, revirtiendo los contadores. *(VenderAnimalesModal, `calculadora.ts`, useAnularVenta.)*

### Muerte de animales
Registrar la muerte de un animal (causa, fecha) lo marca como `muerto` y permite generar un
**reporte de pérdidas en Excel** (relevante porque la muerte de ganado puede ser una **pérdida
deducible** tributariamente). Se puede anular. *(RegistrarMuerteModal, useRegistrarMuerte,
useAnularMuerte.)*

### Sanidad *(Fase 2B)*
Registro de **vacunas y tratamientos** por animal. *(SanidadTab, EventoSanitarioModal,
`eventosSanitarios`.)*

### Trazabilidad SENASA *(Fase 3)*
Campo de **arete oficial SENASA (DIIO)** por animal; **badge ⚠️** en los animales sin arete; aviso
a nivel de finca y por lote de cuántos faltan; y un **indicador de conexión** (online/offline) en la
app. Responde a la obligatoriedad de areteo de SENASA. *(useAnimalesSinArete, indicador offline.)*

### Finanzas — núcleo de rentabilidad *(Fase 4-A)*
Pestaña que calcula, por lote: **kilos producidos**, **costo por kilo** (de engorde y total),
**valor del inventario** en pie, **resultado estimado**, **ROI**, **ganancia diaria promedio** y
**margen por animal**, con el **reparto a medias** cuando corresponde. *(FinanzasFincaTab,
`finanzas.ts` → `calcularFinanzasLote`, `precioRefPorDefecto`.)*

### Simulador "vender hoy vs. esperar" *(Fase 4-B)*
Dado el ritmo de engorde (kg/día), un precio por kilo y un costo diario de mantener, estima si
**conviene vender hoy o esperar N días**: peso futuro, ingreso futuro, costo de mantener, ganancia
de esperar y **valor marginal por día**. *(`simulador.ts` → `simularVenta`.)*

### Exportación
**Excel** de inventario, ventas y pérdidas; **PDF** de lote y un **PDF para el socio** (resumen de la
sociedad). *(exportExcel.ts, exportPDF.ts, ReporteLotePDF, ReporteSocioPDF.)*

---

# Parte IV — Offline-first

## Qué significa

GanaCR está pensado para **seguir funcionando sin internet**. Esto es posible porque Firestore
guarda una **copia local de los datos en el navegador** (en IndexedDB, mediante
`persistentLocalCache`). En la práctica:

- **Leer:** la app muestra los datos desde la copia local, al instante, haya o no señal.
- **Escribir (agregar un animal, registrar un peso, anotar un gasto):** el cambio se aplica de una
  vez en la copia local y se **encola**. Cuando vuelve la conexión, Firestore **sincroniza
  automáticamente** la cola con el servidor. El ganadero no tiene que hacer nada.
- Un **indicador de conexión** en la app le dice si está online u offline, para que sepa que sus
  cambios todavía no se subieron.

## Por qué importa

En muchas zonas ganaderas de Costa Rica la señal es intermitente o inexistente. Una app que se
"cae" sin internet sería inservible en el campo. Offline-first convierte la conexión en un detalle:
el ganadero trabaja igual en el corral y la nube se pone al día sola cuando puede.

## Cómo probarlo

1. Abrí la app **con** conexión y dejá que cargue (login + dashboard).
2. En el navegador, abrí las DevTools → pestaña **Network** → poné **Offline** (o apagá el wifi).
3. Navegá, abrí lotes, **agregá un animal o registrá un peso**: todo responde normal.
4. Volvé a **Online**: los cambios hechos offline se suben solos. (Ya está verificado que funciona.)

## Límite a tener presente

La **primera** carga sí necesita conexión (hay que descargar la aplicación y los datos iniciales).
Una vez cargada, ya funciona offline. No respalda archivos ni fotos (no hay Storage todavía).

---

# Parte V — Seguridad de los datos

La seguridad está en **capas**. Ninguna depende de la "buena fe" del navegador: las reglas viven en
el **servidor** de Firebase.

## 1. Autenticación
Nadie ve nada sin iniciar sesión (Firebase Auth). Cada usuario tiene un **UID** único.

## 2. Reglas de Firestore endurecidas *(merge #24)*
El archivo `firestore.rules` define, **del lado del servidor**, qué puede hacer cada quien. Más allá
del clásico "cada quien ve lo suyo", se endurecieron con varias garantías:

- **Aislamiento por dueño (owner-only):** solo se puede leer/escribir/borrar un documento si su
  `userId` coincide con el UID de quien hace la petición. Un usuario **no puede tocar los datos de
  otro**, ni siquiera leerlos.
- **`userId` inmutable:** una vez creado, el dueño de un documento **no se puede cambiar** (no se
  puede "regalar" ni secuestrar un registro).
- **Crear como dueño:** al crear un documento, su `userId` **tiene que ser** el del que lo crea (no
  se puede crear algo a nombre de otro).
- **Sanity de tipos en campos críticos:** por ejemplo, el `estado` de un animal solo puede ser
  `activo`/`vendido`/`muerto`; `tipoPropiedad` de un lote solo `propio`/`medias`; los montos y pesos
  tienen que ser **números**. Datos basura quedan rechazados en el servidor.
- **Tope de tamaño por documento** (≤ 40 campos): freno anti-abuso.

> **Importante (operativo):** las reglas viven en producción. Cambiarlas en el repo **no** las
> aplica; hay que correr `firebase deploy --only firestore:rules`. Una colección **sin** regla
> desplegada **deniega toda escritura** en producción (lección aprendida con `gastosFinca` y
> `eventosSanitarios`). El endurecimiento de #24 queda activo en prod cuando se haga ese deploy.

## 3. Pruebas de las reglas
`tests/rules/firestore-rules.test.ts` — **42 pruebas** con `@firebase/rules-unit-testing` corriendo
contra el emulador: verifican el **aislamiento** entre dos usuarios (A no puede leer/crear/borrar
datos de B en ninguna de las 9 colecciones), la **inmutabilidad** del `userId`, los **tipos/enums**
inválidos y el **tope de tamaño**. Comando: `npm run test:rules`.

## 4. Verificación cruzada
Las reglas estrictas tienen un riesgo: que bloqueen una escritura **legítima**. Por eso, después de
endurecerlas se corre la **suite E2E**, que escribe datos reales **a través de la app**. Si una
regla quedó demasiado estricta, el E2E falla — es el guardarraíl de que no se rompió nada real.

## 5. Anti-bots y secretos
- **App Check (reCAPTCHA v3)** en producción bloquea navegadores automatizados y abuso de la API.
- **`scripts/service-account.json`** (credencial muy privilegiada del Admin SDK) está **gitignored**:
  nunca se versiona ni se comparte.

## Pendiente / hoja de ruta de seguridad
- Desplegar las reglas endurecidas a prod (`firebase deploy --only firestore:rules`).
- Capas adicionales en evaluación: *security gates* en CI (auditoría de dependencias, escaneo de
  secretos), cabeceras de seguridad HTTP, y un *pentest* con el equipo de ciberseguridad.

---

# Parte VI — Respaldo y recuperación (DR) *(PR #25)*

## El seguro ante el caso extremo

¿Y si algún día Firebase falla, se borra algo por error, o se quiere migrar? Para eso existe el
sistema de respaldo: exporta **todos los datos** a un **formato abierto** guardable **fuera de la
nube** y **restaurable**.

## Las tres herramientas
- **`npm run backup:export`** — lee las 9 colecciones y escribe `backups/<fecha>/` con un archivo
  **NDJSON** por colección (un documento JSON por línea) + un `manifest.json` con los conteos.
- **`npm run backup:import -- <carpeta>`** — restaura un respaldo a Firestore. Tiene una
  **salvaguarda**: si el destino **ya tiene datos**, se detiene (para no pisar producción por
  accidente). Para restaurar de verdad se apunta a un proyecto **nuevo/vacío**; para sobrescribir a
  propósito, `--force`.
- **`npm run backup:verify -- <carpeta>`** — valida la **integridad** del respaldo en disco
  (que los conteos cuadren con el manifest y que ningún JSON esté corrupto).

## Qué incluye y qué no
- **Incluye:** las **9 colecciones** de Firestore (todos los datos de ganado, fincas, ventas, etc.).
- **No incluye:** **Firebase Auth** (las cuentas). Es deliberado: no se sacan hashes de contraseñas
  fuera de la nube. Las cuentas son recuperables; los **datos** son lo irremplazable.

## Probado de verdad
- Un **test de round-trip** (`npm run test:backup`) siembra el emulador, exporta, **borra**,
  importa y verifica que **los conteos vuelven a coincidir** — sin tocar producción.
- Ya se hizo un **export real de producción**: **2.812 documentos** (13 lotes, 685 animales, 2.052
  pesajes…) exportados y verificados **íntegros**.
- La carpeta `backups/` está **gitignored** (contiene datos personales; nunca se versiona).

## Capas recomendadas (runbook)
El runbook completo está en **`docs/runbook-respaldo-dr.md`**. Resumen de las tres capas:
1. **Export off-cloud** manual/periódico (semanal), guardado fuera de Google Cloud (disco cifrado u
   otro proveedor).
2. **PITR** (Point-in-Time Recovery) de Firestore, activable en la consola: rollback continuo.
3. **Backups programados** a un bucket **GCS**: respaldo gestionado en la nube.
Y un **simulacro de restauración** periódico: *un backup que nunca restauraste no es un backup.*

---

# Parte VII — Pruebas automatizadas

GanaCR tiene **cuatro suites**. Las que usan el emulador requieren **JDK 17** instalado.

| Suite | Comando | Qué cubre | Herramienta |
|---|---|---|---|
| **Unit** | `npm run test:unit` | Cálculos (ventas, finanzas), filtro de animales, render de PDF, formato/integridad de respaldo. Rápidas, sin emulador. | `node:test` + tsx |
| **E2E** | `npm run test:e2e` | Flujos reales por la app (login, lotes, animales, pesos, ventas, muerte, mover, gastos, sanidad, SENASA, filtro, exports, offline, responsive) en escritorio y móvil. | Playwright + emulador |
| **Reglas** | `npm run test:rules` | Las 42 pruebas de seguridad de Firestore (Parte V). | rules-unit-testing + emulador |
| **Respaldo** | `npm run test:backup` | Round-trip export→borrar→import→verificar. | `node:test` + emulador |

**Datos de prueba:** el emulador se siembra con datos deterministas (`scripts/seed-emulator.ts` +
`tests/e2e/fixtures.ts`): 2 fincas, 2 lotes (uno propio y uno a medias), animales, gastos y una
venta. Así las pruebas son repetibles.

**Por qué emulador y no producción:** App Check bloquea navegadores automatizados, así que el E2E
corre contra el **emulador de Firebase** (Firestore + Auth locales), que no tiene App Check y no
toca datos reales.

---

# Parte VIII — Flujo de trabajo y despliegue

## Cómo se construye cada feature
El trabajo sigue un ciclo disciplinado, apoyado en *skills*:

```
brainstorming  →  spec        →  plan            →  ejecución (TDD)  →  PR
(explorar       (docs/...      (docs/...           (test primero,     (revisión
 intención e     specs/)        plans/, tareas      luego código,      de José →
 requisitos)                    pequeñas)           commits frecuentes) merge)
```

- Los **specs** viven en `docs/superpowers/specs/` y los **planes** en `docs/superpowers/plans/`.
- Se trabaja **por Pull Request**, en una rama desde `main` (`feature/…`, `fix/…`, `chore/…`,
  `docs/…`, `ops/…`, `security/…`).
- Antes de abrir el PR se verifica: `npx tsc --noEmit`, `npm run lint`, `npm run build` y las
  pruebas que apliquen.
- **Nunca se mergea a `main` sin la aprobación de José.**

## Despliegue
Cuando un PR se mergea a `main`, **Vercel despliega automáticamente** producción. Dos cosas que
**no** son automáticas y se hacen aparte cuando cambian:
- **Reglas** de Firestore: `firebase deploy --only firestore:rules`.
- **Índices** de Firestore: `firebase deploy --only firestore:indexes` (hoy `indexes.json` está
  vacío porque las consultas ordenan en el cliente, así que no requieren índices compuestos).

---

# Parte IX — Estado actual y hoja de ruta

## Completo y en producción
- **MVP:** auth, dashboard, lotes (propio/a medias), animales, pesajes, gastos, ventas con utilidad
  y reparto a medias, y CRUD completo (incluida anulación de ventas).
- **Fase 2A — Multi-finca:** colección `fincas`, finca activa, mover animales entre lotes, gastos de
  finca con distribución. *(Pendiente menor: mover animales entre fincas distintas.)*
- **Fase 2B — Gestión básica (parcial):** sanidad ✅, gráficos de peso ✅, exports Excel/PDF ✅.
  El **control de partos** se trasladó al futuro **módulo de Cría** (este sistema es de engorde).
- **Rediseño UI:** migración completa a Tailwind v4 + shadcn/ui (paleta Campo Claro).
- **Fase 3 — SENASA:** areteo oficial (DIIO), avisos de animales sin arete, indicador offline.
- **Fase 4-A — Finanzas:** núcleo de rentabilidad.
- **Fase 4-B — Simulador:** vender hoy vs. esperar.
- **Seguridad:** reglas endurecidas + 42 tests *(en `main`; falta el `deploy` de reglas)*.
- **Respaldo/DR:** export/import/verify + runbook + round-trip *(en revisión, PR #25)*.

## Pendientes inmediatos
- `firebase deploy --only firestore:rules` (activar el endurecimiento en prod).
- Revisar/mergear PRs abiertos (#23 simulador, #25 respaldo/DR).
- Mover animales entre fincas distintas (resto de Fase 2A).
- Control de partos → módulo de Cría (a futuro).

## Hoja de ruta (fases futuras)
- **Fase 5 — Pastos y potreros:** mapa de potreros, rotación, carga animal, alertas de sobrepastoreo.
- **Fase 6 — Cumplimiento SUGEF/subastas:** registro de compraventa con contraparte, trazabilidad
  del dinero, límites de efectivo (expedientes 24.746 y 25.129).
- **Fase 7 — Portal del socio:** vista de solo lectura para el socio, reporte mensual automático,
  firma digital de acuerdos.

> *Nota:* La **Fase 4-C** (módulo de crédito MAG) se **descartó** del plan: la tasa real vigente no
> era la esperada y no se consideró un diferencial prioritario hoy. Las **guías de movilización**
> propias también se descartaron tras investigar su viabilidad legal.

---

# Apéndice A — Comandos útiles

```bash
# Desarrollo
npm run dev                 # levantar la app en local
npm run build               # build de producción (tsc + vite)
npm run lint                # linter

# Pruebas  (las que usan emulador requieren JDK 17)
npm run test:unit           # unitarias rápidas
npm run test:e2e            # end-to-end (Playwright + emulador)
npm run test:rules          # reglas de seguridad de Firestore
npm run test:backup         # round-trip de respaldo

# Respaldo / DR
npm run backup:export                      # exporta prod a backups/<fecha>/
npm run backup:verify -- backups/<fecha>   # valida integridad del respaldo
npm run backup:import  -- backups/<fecha>  # restaura (a un proyecto vacío)

# Despliegue de Firebase (lo que Vercel NO hace)
firebase deploy --only firestore:rules     # publicar reglas de seguridad
firebase deploy --only firestore:indexes   # publicar índices
```

> En entornos con inspección SSL corporativa, los scripts de Admin SDK usan
> `NODE_TLS_REJECT_UNAUTHORIZED=0` internamente. El emulador necesita `JAVA_HOME` apuntando a JDK 17.

# Apéndice B — Glosario

- **A medias:** sociedad sobre un lote/animal; la utilidad se reparte según el porcentaje del socio.
- **Arete interno vs. DIIO:** el arete interno es el del ganadero; el **DIIO** es el **arete oficial
  SENASA**, obligatorio para trazabilidad.
- **SENASA:** Servicio Nacional de Salud Animal (CR); exige areteo y registro de movilización.
- **SUGEF / Ley 7786:** regulación financiera; expedientes en trámite buscarían incluir subastas
  ganaderas como sujetos obligados (Fase 6).
- **MAG:** Ministerio de Agricultura y Ganadería; ofrece líneas de crédito (Fase 4-C, descartada).
- **Offline-first:** la app funciona sin internet y sincroniza al reconectar.
- **Firestore:** base de datos de documentos de Firebase. **Firebase Auth:** su servicio de login.
- **Reglas de Firestore:** código del lado del servidor que decide quién puede leer/escribir qué.
- **Emulador:** Firestore/Auth **locales** para pruebas, sin tocar producción (necesita JDK 17).
- **NDJSON:** *Newline-Delimited JSON* — un objeto JSON por línea; formato abierto del respaldo.
- **PITR:** *Point-in-Time Recovery* — recuperación a un instante anterior, capa de respaldo de la
  consola de Firebase.
- **DR:** *Disaster Recovery* — recuperación ante desastres.
- **CRUD:** Crear, Leer, Actualizar, Borrar (las cuatro operaciones básicas sobre un dato).
- **E2E:** *end-to-end* — prueba que ejercita la app completa como lo haría un usuario real.

---

*Esta guía vive en `docs/guia-del-sistema.md`. Mantenela actualizada cuando cambie el sistema: es el
mapa para vos hoy y para cualquiera que se sume al proyecto.*
