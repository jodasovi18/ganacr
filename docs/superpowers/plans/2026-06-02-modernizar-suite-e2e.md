# Modernización de la suite E2E (Firebase Emulator) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las suites Playwright pre-migración (que no corren) por una suite E2E determinista sobre el Firebase Emulator (Firestore + Auth) con datos sembrados, más tests Node rápidos para cálculos y render de PDF.

**Architecture:** El emulador no aplica App Check, así que la automatización carga datos reales. La app se conecta al emulador solo con el flag `VITE_USE_EMULATOR=true` (prod/dev intactos). `firebase emulators:exec` levanta/apaga los emuladores; Playwright maneja vite (`--mode test`) y un globalSetup que resiembra. Specs nuevos en `tests/e2e/` (browser, ruta crítica) y `tests/unit/` (Node).

**Tech Stack:** Playwright, Firebase Emulator Suite (firebase-tools devDep), firebase-admin, tsx, Vite, Node 22, JDK 17.

**Prerequisito del entorno:** JDK 17 instalado (el emulador Firestore requiere Java 11+). Sin esto, `test:e2e` falla al arrancar el emulador.

**Convención de selectores:** preferir `getByRole`/`getByText` con los textos visibles de la UI (shadcn). El código de cada spec es un punto de partida concreto; el paso "correr y ajustar" del loop TDD afina selectores ambiguos. Agregar `data-testid` solo si role/text no alcanza.

---

## Pre-flight del entorno

### Task 0: JDK 17 + resolver el shim de Node

**Objetivo:** garantizar Java 11+ y que `node`/`npx` resuelvan al Node 22 real. Hay un paquete `node` **global parásito** que resuelve a Node v8 y rompe `firebase-tools` (CLI corre sobre Node).

- [ ] **Step 1: Verificar Java 11+**

Run: `java -version`
Expected: versión 11 o mayor (ej. `17`). Si muestra `1.8` → instalar **Temurin JDK 17** y reabrir la terminal.

- [ ] **Step 2: Detectar el shim de Node**

Run: `npm exec -- node -v`
Expected: `v22.x`. Si muestra `v8.x` → hay un paquete `node` global parásito (Step 3).

- [ ] **Step 3: Quitar el paquete `node` global parásito (si aplica)**

Run:
```bash
npm uninstall -g node
npm exec -- node -v
```
Expected: el segundo comando ahora imprime `v22.x`.
(El paquete se instaló por accidente con `npm i -g node`; el Node real viene del instalador oficial y no se ve afectado.)

---

## Fase 0 — Infra del emulador

### Task 1: firebase-tools devDep + bloque emulators + .env.test

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `firebase.json`
- Create: `.env.test`

- [ ] **Step 1: Instalar firebase-tools como devDependency**

Run:
```bash
npm install -D firebase-tools@^14
```
Expected: agrega `firebase-tools` a devDependencies; sin errores (Node 22).

- [ ] **Step 2: Agregar bloque `emulators` a `firebase.json`**

Reemplazar el contenido de `firebase.json` por:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "singleProjectMode": true,
    "ui": { "enabled": false }
  }
}
```

- [ ] **Step 3: Crear `.env.test`**

```
VITE_USE_EMULATOR=true
```

- [ ] **Step 4: Verificar que el emulador arranca (requiere JDK 17)**

Run:
```bash
npx firebase emulators:start --only firestore,auth --project ganacr
```
Expected: imprime "All emulators ready"; Firestore en :8080, Auth en :9099. Cortar con Ctrl+C.
Si falla con error de Java → falta JDK 17 (prerequisito).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json firebase.json .env.test
git commit -m "test(e2e): firebase-tools devDep + emulators en firebase.json + .env.test"
```

---

### Task 2: La app se conecta al emulador con el flag

**Files:**
- Modify: `src/services/firebase.ts`

- [ ] **Step 1: Conectar a los emuladores cuando `VITE_USE_EMULATOR==='true'`**

Editar `src/services/firebase.ts`. Cambiar el import de firestore para incluir `connectFirestoreEmulator`, el de auth para incluir `connectAuthEmulator`, y agregar el bloque de conexión justo después de crear `db`:

```ts
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
```

Y después de `export const db = initializeFirestore(...)`:
```ts
// Modo test: conectar a los emuladores locales (sin App Check, datos sembrados).
// Activado solo por .env.test (vite --mode test). No afecta prod ni dev normal.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}
```
Nota: `auth` se exporta antes de `db` en el archivo actual; mover la conexión de `auth` debajo de su `export const auth = getAuth(app)` o agrupar ambas después de declarar `db`. El flag guarda todo: prod (App Check) intacto.

- [ ] **Step 2: Verificar typecheck/build**

Run:
```bash
npm run build
```
Expected: `✓ built` sin errores TS.

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase.ts
git commit -m "test(e2e): firebase.ts conecta a emuladores con VITE_USE_EMULATOR"
```

---

## Fase 1 — Seed determinista

### Task 3: Fixtures compartidas

**Files:**
- Create: `tests/e2e/fixtures.ts`

- [ ] **Step 1: Definir las constantes (single source of truth)**

```ts
// tests/e2e/fixtures.ts — constantes compartidas entre el seed y los specs.
export const USER = {
  uid: 'e2e-user',
  email: 'e2e@ganacr.test',
  password: 'e2e-pass-123',
  nombre: 'Tester E2E',
} as const;

export const FINCA_ESPERANZA = { id: 'finca-esperanza', nombre: 'La Esperanza' } as const;
export const FINCA_ROBLE = { id: 'finca-roble', nombre: 'El Roble' } as const;

export const LOTE_PROPIO = { id: 'lote-propio', nombre: 'Brahman Propio' } as const;
export const LOTE_MEDIAS = { id: 'lote-medias', nombre: 'Nelore Socio' } as const;
export const SOCIO = { nombre: 'Esteban Chaves', porcentaje: 50 } as const;

// Animales del lote propio (La Esperanza). 1 con arete, 2 sin → alerta "2 sin arete".
export const PROPIO_ANIMALES = [
  { id: 'bp-1', numeroArete: 'BP-001', raza: 'Brahman',   origen: 'comprado',     areteSenasa: 'CR-DIIO-001', pesoInicial: 300, pesoActual: 380, precioCompra: 400000, estado: 'activo' },
  { id: 'bp-2', numeroArete: 'BP-002', raza: 'Brahman',   origen: 'nacido_finca', areteSenasa: '',            pesoInicial: 250, pesoActual: 340, precioCompra: 350000, estado: 'activo' },
  { id: 'bp-3', numeroArete: 'BP-003', raza: 'Charolais', origen: 'sin_registro', areteSenasa: '',            pesoInicial: 280, pesoActual: 360, precioCompra: 300000, estado: 'activo' },
] as const;

// Animales del lote a-medias (El Roble). 1 activo c/arete, 1 activo s/arete, 1 vendido, 1 muerto.
export const MEDIAS_ANIMALES = [
  { id: 'ns-1', numeroArete: 'NS-001', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-101', pesoInicial: 320, pesoActual: 410, precioCompra: 450000, estado: 'activo' },
  { id: 'ns-2', numeroArete: 'NS-002', raza: 'Nelore', origen: 'comprado', areteSenasa: '',            pesoInicial: 300, pesoActual: 395, precioCompra: 430000, estado: 'activo' },
  { id: 'ns-3', numeroArete: 'NS-003', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-103', pesoInicial: 310, pesoActual: 480, precioCompra: 420000, estado: 'vendido' },
  { id: 'ns-4', numeroArete: 'NS-004', raza: 'Nelore', origen: 'comprado', areteSenasa: 'CR-DIIO-104', pesoInicial: 305, pesoActual: 300, precioCompra: 440000, estado: 'muerto' },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/fixtures.ts
git commit -m "test(e2e): fixtures deterministas compartidas"
```

---

### Task 4: Admin del emulador + seed

**Files:**
- Create: `scripts/emulator-admin.ts`
- Create: `scripts/seed-emulator.ts`

- [ ] **Step 1: Init de firebase-admin apuntado al emulador**

```ts
// scripts/emulator-admin.ts — Admin SDK contra el emulador (sin service-account).
import admin from 'firebase-admin';

// Defaults para corrida standalone; bajo `firebase emulators:exec` ya vienen seteadas.
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';

const PROJECT_ID = 'ganacr';
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

export const db = admin.firestore();
export const auth = admin.auth();
export { PROJECT_ID };
```

- [ ] **Step 2: Seed que limpia y siembra (export `seedEmulator` + CLI)**

```ts
// scripts/seed-emulator.ts — limpia el emulador y siembra los fixtures de E2E.
import { db, auth, PROJECT_ID } from './emulator-admin';
import {
  USER, FINCA_ESPERANZA, FINCA_ROBLE, LOTE_PROPIO, LOTE_MEDIAS, SOCIO,
  PROPIO_ANIMALES, MEDIAS_ANIMALES,
} from '../tests/e2e/fixtures';

const NOW = '2026-06-02T00:00:00.000Z';
const FH = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const AH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';

async function clearAll() {
  await fetch(`http://${FH}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${AH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

function loteDesdeAnimales(base: { id: string; nombre: string }, fincaId: string, tipoPropiedad: 'propio' | 'medias', animales: readonly any[], totalGastos: number, ventas: any[]) {
  const totalInvertido = animales.reduce((s, a) => s + a.precioCompra, 0);
  const totalVentas = ventas.reduce((s, v) => s + v.totalVenta, 0);
  return {
    id: base.id, userId: USER.uid, fincaId, nombreLote: base.nombre,
    fechaCompra: '2026-01-14', tipoPropiedad,
    socio: tipoPropiedad === 'medias' ? { ...SOCIO } : null,
    totalAnimales: animales.length,
    animalesActivos: animales.filter(a => a.estado === 'activo').length,
    animalesVendidos: animales.filter(a => a.estado === 'vendido').length,
    animalesMuertos: animales.filter(a => a.estado === 'muerto').length,
    totalInvertido, totalGastos, totalVentas,
    utilidadTotal: ventas.reduce((s, v) => s + v.utilidadBruta, 0),
    createdAt: NOW, updatedAt: NOW,
  };
}

function animalDoc(a: any, fincaId: string, loteId: string) {
  return {
    id: a.id, userId: USER.uid, fincaId, loteId,
    numeroArete: a.numeroArete, raza: a.raza, origen: a.origen, areteSenasa: a.areteSenasa,
    pesoInicial: a.pesoInicial, pesoActual: a.pesoActual, precioCompra: a.precioCompra,
    estado: a.estado, fechaIngreso: '2026-01-14',
    createdAt: NOW, updatedAt: NOW,
  };
}

export async function seedEmulator() {
  await clearAll();

  // Usuario de Auth con UID fijo
  await auth.createUser({ uid: USER.uid, email: USER.email, password: USER.password, displayName: USER.nombre });

  const batch = db.batch();
  // users
  batch.set(db.collection('users').doc(USER.uid), { id: USER.uid, email: USER.email, nombre: USER.nombre, createdAt: NOW });
  // fincas
  for (const f of [FINCA_ESPERANZA, FINCA_ROBLE]) {
    batch.set(db.collection('fincas').doc(f.id), { id: f.id, userId: USER.uid, nombre: f.nombre, createdAt: NOW, updatedAt: NOW });
  }

  // Venta del lote a-medias (vende ns-3): utilidad bruta y reparto 50/50
  const ventaMedias = {
    id: 'venta-1', userId: USER.uid, fincaId: FINCA_ROBLE.id, loteId: LOTE_MEDIAS.id,
    fecha: '2026-04-10',
    animales: [{ animalId: 'ns-3', numeroArete: 'NS-003', pesoFinal: 480, precioVenta: 700000, precioCompra: 420000 }],
    cantidadAnimales: 1, totalInversion: 420000, gastosProporcion: 30000,
    totalVenta: 700000, utilidadBruta: 250000, utilidadSocio: 125000, utilidadPropietario: 125000,
    createdAt: NOW,
  };

  const lotePropio = loteDesdeAnimales(LOTE_PROPIO, FINCA_ESPERANZA.id, 'propio', PROPIO_ANIMALES, 120000, []);
  const loteMedias = loteDesdeAnimales(LOTE_MEDIAS, FINCA_ROBLE.id, 'medias', MEDIAS_ANIMALES, 60000, [ventaMedias]);
  batch.set(db.collection('lotes').doc(lotePropio.id), lotePropio);
  batch.set(db.collection('lotes').doc(loteMedias.id), loteMedias);

  for (const a of PROPIO_ANIMALES) batch.set(db.collection('animales').doc(a.id), animalDoc(a, FINCA_ESPERANZA.id, LOTE_PROPIO.id));
  for (const a of MEDIAS_ANIMALES) batch.set(db.collection('animales').doc(a.id), animalDoc(a, FINCA_ROBLE.id, LOTE_MEDIAS.id));

  // Gastos
  batch.set(db.collection('gastos').doc('g-propio-1'), { id: 'g-propio-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, concepto: 'Sales minerales', tipo: 'alimento', monto: 120000, fecha: '2026-02-01', createdAt: NOW });
  batch.set(db.collection('gastos').doc('g-medias-1'), { id: 'g-medias-1', userId: USER.uid, fincaId: FINCA_ROBLE.id, loteId: LOTE_MEDIAS.id, concepto: 'Desparasitante', tipo: 'veterinario', monto: 60000, fecha: '2026-03-15', createdAt: NOW });
  // Venta
  batch.set(db.collection('ventas').doc(ventaMedias.id), ventaMedias);
  // Pesos (historial mínimo para gráficos de A1 propio)
  batch.set(db.collection('pesos').doc('p-1'), { id: 'p-1', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, animalId: 'bp-1', peso: 300, fecha: '2026-01-14', createdAt: NOW });
  batch.set(db.collection('pesos').doc('p-2'), { id: 'p-2', userId: USER.uid, fincaId: FINCA_ESPERANZA.id, loteId: LOTE_PROPIO.id, animalId: 'bp-1', peso: 380, fecha: '2026-03-14', createdAt: NOW });

  await batch.commit();
  console.log('✅ Emulador sembrado (2 fincas, 2 lotes, 7 animales, 2 gastos, 1 venta).');
}

// CLI
if (process.argv[1] && process.argv[1].includes('seed-emulator')) {
  seedEmulator().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/emulator-admin.ts scripts/seed-emulator.ts
git commit -m "test(e2e): seed del emulador (Auth user + datos deterministas)"
```

---

### Task 5: Scripts npm + verificación manual del seed

**Files:**
- Modify: `package.json` (scripts)

- [ ] **Step 1: Agregar scripts**

En `package.json` → `scripts`, agregar:
```json
"emu": "firebase emulators:start --only firestore,auth --project ganacr",
"seed:emulator": "tsx scripts/seed-emulator.ts",
"test:e2e": "firebase emulators:exec --only firestore,auth --project ganacr \"playwright test\"",
"test:unit": "node --import tsx --test \"tests/unit/**/*.test.ts\"",
"test": "npm run test:unit && npm run test:e2e"
```

- [ ] **Step 2: Verificar seed manual (2 terminales)**

Terminal A: `npm run emu`  (deja corriendo)
Terminal B: `npm run seed:emulator`
Expected B: `✅ Emulador sembrado (...)`. Sin errores. (En firestore :8080 quedan los docs.)
Cortar el emulador (Ctrl+C en A).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "test(e2e): scripts emu/seed:emulator/test:e2e/test:unit/test"
```

---

## Fase 2 — Harness Playwright

### Task 6: Config consolidado + globalSetup + helpers

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/helpers.ts`

- [ ] **Step 1: Reescribir `playwright.config.ts` (projects desktop+mobile)**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: 'npx vite --mode test --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: { baseURL: 'http://localhost:5174', screenshot: 'only-on-failure', video: 'off', headless: true },
  outputDir: 'tests/e2e/.artifacts',
  projects: [
    { name: 'desktop', testIgnore: /responsive\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 5'] } },
  ],
});
```

- [ ] **Step 2: globalSetup que resiembra**

```ts
// tests/e2e/global-setup.ts
import { seedEmulator } from '../../scripts/seed-emulator';

export default async function globalSetup() {
  await seedEmulator();
}
```

- [ ] **Step 3: helpers de login + navegación**

```ts
// tests/e2e/helpers.ts
import { Page, expect } from '@playwright/test';
import { USER, LOTE_PROPIO } from './fixtures';

export async function login(page: Page) {
  await page.goto('/');
  await page.fill('input#email', USER.email);
  await page.fill('input#password', USER.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('ANIMALES')).toBeVisible({ timeout: 20_000 });
}

/** Cambia la finca activa por nombre vía el selector del navbar. */
export async function seleccionarFinca(page: Page, nombre: string) {
  await page.getByText(nombre, { exact: false }).first().click().catch(() => {});
}

/** Entra al lote por su nombre (botón "Ver lote" de su card). */
export async function abrirLote(page: Page, nombreLote = LOTE_PROPIO.nombre) {
  const card = page.locator('div').filter({ hasText: nombreLote }).first();
  await card.getByRole('button', { name: /Ver lote/i }).click();
  await expect(page).toHaveURL(/\/lote\//);
}
```

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/global-setup.ts tests/e2e/helpers.ts
git commit -m "test(e2e): config consolidado (desktop+mobile) + globalSetup + helpers"
```

---

### Task 7: Primer spec E2E verde (auth) — prueba el pipeline completo

**Files:**
- Create: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, seleccionarFinca } from './helpers';
import { FINCA_ESPERANZA, FINCA_ROBLE } from './fixtures';

test.describe('Auth & Dashboard', () => {
  test('login muestra el Dashboard con stats', async ({ page }) => {
    await login(page);
    await expect(page.getByText('LOTES')).toBeVisible();
    await expect(page.getByText('ANIMALES')).toBeVisible();
    await expect(page.getByText('INVERTIDO')).toBeVisible();
    await expect(page.getByText('UTILIDAD')).toBeVisible();
  });

  test('el selector de finca cambia el contexto', async ({ page }) => {
    await login(page);
    await expect(page.getByText(FINCA_ESPERANZA.nombre).first()).toBeVisible();
    await seleccionarFinca(page, FINCA_ROBLE.nombre);
    await expect(page.getByText(FINCA_ROBLE.nombre).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Correr toda la cadena (requiere JDK 17)**

Run:
```bash
npm run test:e2e
```
Expected: emulador arranca → globalSetup siembra → vite sirve `--mode test` → la app conecta al emulador → `auth.spec.ts` pasa en verde (project desktop). Emulador se apaga al terminar.
Si un selector falla, ajustarlo viendo el screenshot en `tests/e2e/.artifacts/` y reintentar (loop TDD).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test(e2e): auth spec verde — pipeline emulador+seed+vite funcionando"
```

---

## Fase 3 — Specs de ruta crítica

> Para Tasks 8–16: el patrón de cada step es **escribir el spec → correr → ajustar selectores si falla → verde → commit**. Cada spec usa `login(page)` en `beforeEach`.
>
> **Cómo correr:** `npm run test:e2e` corre TODA la suite. Para iterar un solo spec (más rápido), el filtro debe ir **dentro de las comillas** del comando de Playwright:
> ```bash
> npx firebase emulators:exec --only firestore,auth --project ganacr "npx playwright test tests/e2e/<spec>.spec.ts"
> ```
> ⚠️ `npm run test:e2e -- <spec>` **NO** funciona: el argumento se lo come `emulators:exec`, no Playwright.

### Task 8: lotes.spec.ts

**Files:**
- Create: `tests/e2e/lotes.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Lotes', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('lista los lotes sembrados', async ({ page }) => {
    await expect(page.getByText(LOTE_PROPIO.nombre)).toBeVisible();
  });

  test('crea un lote propio nuevo', async ({ page }) => {
    await page.getByRole('button', { name: /Nuevo lote/i }).click();
    await page.getByLabel(/Nombre del lote/i).fill('QA Lote E2E');
    await page.getByRole('button', { name: /Crear lote/i }).click();
    await expect(page.getByText('QA Lote E2E')).toBeVisible({ timeout: 10_000 });
  });

  test('borra un lote (cascade)', async ({ page }) => {
    // usa el lote recién creado o uno dedicado; abrir menú ⋮ o botón borrar de su card
    const card = page.locator('div').filter({ hasText: 'QA Lote E2E' }).first();
    await card.getByRole('button', { name: /eliminar|borrar/i }).click().catch(async () => {
      await card.getByRole('button').last().click(); // botón trash (icono)
    });
    await page.getByRole('button', { name: /Eliminar|Confirmar/i }).click();
    await expect(page.getByText('QA Lote E2E')).toHaveCount(0, { timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar**

Run: `npm run test:e2e` (o un solo spec, ver intro de Fase 3)
Expected: verde. Ajustar labels/roles del `CrearLoteModal`/`ConfirmarBorradoModal` si difieren (inspeccionar el componente).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/lotes.spec.ts
git commit -m "test(e2e): lotes (listar, crear, borrar-cascade)"
```

---

### Task 9: animales.spec.ts

**Files:**
- Create: `tests/e2e/animales.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Animales', () => {
  test.beforeEach(async ({ page }) => { await login(page); await abrirLote(page, LOTE_PROPIO.nombre); });

  test('muestra los animales sembrados con su arete', async ({ page }) => {
    await expect(page.getByText('BP-001')).toBeVisible();
    await expect(page.getByText('CR-DIIO-001')).toBeVisible(); // DIIO SENASA
  });

  test('agrega un animal comprado con arete SENASA', async ({ page }) => {
    await page.getByRole('button', { name: /Agregar animal/i }).click();
    await page.getByLabel(/N.*arete/i).first().fill('BP-099');
    await page.getByLabel(/Raza/i).fill('Brahman');
    await page.getByLabel(/Arete.*SENASA|DIIO/i).fill('CR-DIIO-099');
    await page.getByRole('button', { name: /Agregar|Guardar/i }).click();
    await expect(page.getByText('BP-099')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar labels de `AgregarAnimalModal`.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): animales (listar, alta con arete SENASA)"`

---

### Task 10: ventas.spec.ts

**Files:**
- Create: `tests/e2e/ventas.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_MEDIAS } from './fixtures';

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('el lote a-medias muestra su venta y el socio', async ({ page }) => {
    await abrirLote(page, LOTE_MEDIAS.nombre);
    await expect(page.getByText('Esteban Chaves')).toBeVisible();
  });

  test('vender un animal activo recalcula contadores', async ({ page }) => {
    await abrirLote(page, LOTE_MEDIAS.nombre);
    await page.getByRole('button', { name: /Vender/i }).first().click();
    // seleccionar NS-001 y confirmar
    await page.getByText('NS-001').click();
    await page.getByLabel(/Precio|Total/i).first().fill('650000');
    await page.getByRole('button', { name: /Vender|Confirmar/i }).click();
    await expect(page.getByText(/vendido/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `VenderAnimalesModal`.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): ventas (venta a-medias, recalculo)"`

---

### Task 11: mover.spec.ts

**Files:**
- Create: `tests/e2e/mover.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Mover animales', () => {
  test('abre el modal de mover desde el lote', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('button', { name: /Mover/i }).first().click();
    await expect(page.getByText(/Mover animales/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `MoverAnimalesModal`. Si hay 2+ lotes en la misma finca, completar el flujo de mover y assert del contador destino.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): mover animales (modal)"`

---

### Task 12: gastos-finca.spec.ts

**Files:**
- Create: `tests/e2e/gastos-finca.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Gastos de finca', () => {
  test('registra un gasto de finca con distribución', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: /Gastos de Finca/i }).click();
    await page.getByRole('button', { name: /Registrar gasto|Nuevo gasto/i }).click();
    await page.getByLabel(/Concepto/i).fill('Camino E2E');
    await page.getByLabel(/Monto/i).fill('60000');
    await page.getByRole('button', { name: /Registrar|Guardar/i }).click();
    await expect(page.getByText('Camino E2E')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `GastoFincaModal`. El gasto de finca necesita ≥1 lote con animales activos en la finca activa — el seed lo cumple.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): gasto de finca con distribución"`

---

### Task 13: muerte.spec.ts

**Files:**
- Create: `tests/e2e/muerte.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Muerte / baja', () => {
  test('registra la muerte de un animal con aviso fiscal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    // abrir acciones del animal BP-003 → registrar muerte
    const fila = page.locator('tr, div').filter({ hasText: 'BP-003' }).first();
    await fila.getByRole('button', { name: /muerte|baja|⋮|acciones/i }).first().click().catch(() => {});
    await page.getByText(/Registrar muerte/i).click();
    await expect(page.getByText(/Ley 7092|deducible|declaración de renta/i)).toBeVisible();
    await page.getByRole('button', { name: /Registrar muerte|Confirmar/i }).click();
    await expect(page.getByText(/muerto/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `RegistrarMuerteModal`. Verificar el texto exacto del aviso fiscal en el componente.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): registrar muerte con aviso fiscal"`

---

### Task 14: sanidad.spec.ts

**Files:**
- Create: `tests/e2e/sanidad.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Sanidad', () => {
  test('registra un evento sanitario', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('tab', { name: /Sanidad/i }).click();
    await page.getByRole('button', { name: /Registrar|Nuevo evento|evento/i }).first().click();
    await page.getByLabel(/Producto|Nombre/i).first().fill('Vacuna E2E');
    await page.getByLabel(/Costo/i).fill('15000');
    await page.getByRole('button', { name: /Registrar|Guardar/i }).click();
    await expect(page.getByText('Vacuna E2E')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `EventoSanitarioModal`/`SanidadTab`.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): registrar evento sanitario"`

---

### Task 15: areteo-filtro.spec.ts

**Files:**
- Create: `tests/e2e/areteo-filtro.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

test.describe('Areteo y filtro', () => {
  test('el Dashboard avisa de animales sin arete (La Esperanza)', async ({ page }) => {
    await login(page);
    // El lote propio tiene 2 de 3 activos sin areteSenasa
    await expect(page.getByText(/sin arete/i)).toBeVisible();
  });

  test('filtra animales por estado/raza dentro del lote', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    await page.getByRole('button', { name: /Filtrar|Filtros/i }).first().click();
    await page.getByLabel(/Raza/i).fill('Charolais');
    await expect(page.getByText('BP-003')).toBeVisible();
    await expect(page.getByText('BP-001')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Correr y ajustar** — `npm run test:e2e` (o un solo spec, ver intro Fase 3); ajustar a `AnimalesFilterBar`, el aviso de finca y el contador "N sin arete".

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): areteo (alertas sin arete) + filtro avanzado"`

---

### Task 16: responsive.spec.ts (project mobile)

**Files:**
- Create: `tests/e2e/responsive.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
import { test, expect } from '@playwright/test';
import { login, abrirLote } from './helpers';
import { LOTE_PROPIO } from './fixtures';

// Corre solo en el project "mobile" (Pixel 5, 393px) por el testMatch del config.
test.describe('Responsive (mobile, con datos)', () => {
  test('Dashboard no tiene overflow horizontal y muestra navbar móvil', async ({ page }) => {
    await login(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ov).toBeLessThanOrEqual(2);
    await expect(page.getByText('ANIMALES')).toBeVisible();
  });

  test('LoteDetalle no tiene overflow horizontal', async ({ page }) => {
    await login(page);
    await abrirLote(page, LOTE_PROPIO.nombre);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ov).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Correr el project mobile**

Run: `npm run test:e2e` (el project `mobile` corre solo `responsive.spec.ts` por el `testMatch`)
Expected: los 2 tests responsive (project mobile) en verde (overflow ≤ 2px con datos cargados).

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): responsive mobile con datos (sin overflow)"`

---

## Fase 4 — Tests Node rápidos

### Task 17: tests/unit/calculadora.test.ts

**Files:**
- Create: `tests/unit/calculadora.test.ts`

- [ ] **Step 1: Escribir el test (node:test)**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularVenta } from '../../src/utils/calculadora';

test('calcularVenta a-medias 50/50 reparte la utilidad', () => {
  const r = calcularVenta(
    [{ animalId: 'a', numeroArete: 'A', pesoFinal: 400, precioVenta: 600000, precioCompra: 400000 }],
    { tipoPropiedad: 'medias', socio: { nombre: 'X', porcentaje: 50 } } as any,
    [{ monto: 100000 } as any],
    4,
  );
  assert.equal(r.totalInversion, 400000);
  assert.equal(r.gastosProporcion, 25000);      // 100000/4 * 1
  assert.equal(r.totalVenta, 600000);
  assert.equal(r.utilidadBruta, 175000);         // 600000-400000-25000
  assert.equal(r.utilidadSocio, 87500);
  assert.equal(r.utilidadPropietario, 87500);
});

test('calcularVenta propio no reparte', () => {
  const r = calcularVenta(
    [{ animalId: 'a', numeroArete: 'A', pesoFinal: 400, precioVenta: 500000, precioCompra: 400000 }],
    { tipoPropiedad: 'propio', socio: null } as any,
    [],
    2,
  );
  assert.equal(r.utilidadBruta, 100000);
  assert.equal(r.utilidadSocio, undefined);
});
```

- [ ] **Step 2: Correr** — `npm run test:unit` → Expected: 2 tests pass.

- [ ] **Step 3: Commit** — `git commit -m "test(unit): calculadora (reparto venta a-medias)"`

---

### Task 18: tests/unit/filtrar-animales.test.ts (reubicar)

**Files:**
- Create: `tests/unit/filtrar-animales.test.ts`
- Delete: `scripts/test-filtrar-animales.ts`
- Modify: `package.json` (quitar script `test:filtro`)

- [ ] **Step 1: Reescribir como node:test** (migrar los casos de `scripts/test-filtrar-animales.ts`)

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarAnimales, contarFiltrosActivos, FILTRO_VACIO } from '../../src/utils/filtrarAnimales';

type A = Parameters<typeof filtrarAnimales>[0][number];
const animal = (p: Partial<A>): A => ({
  id: p.id ?? 'x', userId: 'u', fincaId: 'f', loteId: 'l',
  numeroArete: p.numeroArete ?? 'A1', raza: p.raza ?? 'Nelore',
  pesoInicial: p.pesoInicial ?? 300, pesoActual: p.pesoActual ?? 400,
  precioCompra: 0, estado: p.estado ?? 'activo',
  fechaIngreso: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  origen: p.origen, areteSenasa: p.areteSenasa,
} as A);

const data: A[] = [
  animal({ id: '1', estado: 'activo', raza: 'Nelore', origen: 'comprado', pesoInicial: 300, pesoActual: 450, areteSenasa: 'CR188-001' }),
  animal({ id: '2', estado: 'vendido', raza: 'Brahman', origen: 'nacido_finca', pesoInicial: 300, pesoActual: 320 }),
  animal({ id: '3', estado: 'muerto', raza: 'Nelore', origen: undefined, pesoInicial: 200, pesoActual: 260 }),
];
const ids = (f: any) => filtrarAnimales(data, f).map(a => a.id);

test('vacío devuelve todos', () => assert.deepEqual(ids(FILTRO_VACIO), ['1', '2', '3']));
test('estado', () => assert.deepEqual(ids({ ...FILTRO_VACIO, estados: ['activo', 'muerto'] }), ['1', '3']));
test('raza', () => assert.deepEqual(ids({ ...FILTRO_VACIO, raza: 'Nelore' }), ['1', '3']));
test('origen comprado (incluye undefined)', () => assert.deepEqual(ids({ ...FILTRO_VACIO, origen: 'comprado' }), ['1', '3']));
test('peso min', () => assert.deepEqual(ids({ ...FILTRO_VACIO, pesoMin: 400 }), ['1']));
test('ganancia rango', () => assert.deepEqual(ids({ ...FILTRO_VACIO, gananciaMin: 50, gananciaMax: 100 }), ['3']));
test('combo AND', () => assert.deepEqual(ids({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), ['1']));
test('contar 0', () => assert.equal(contarFiltrosActivos(FILTRO_VACIO), 0));
test('contar 3', () => assert.equal(contarFiltrosActivos({ ...FILTRO_VACIO, estados: ['activo'], raza: 'Nelore', pesoMin: 400 }), 3));
```

- [ ] **Step 2: Borrar el viejo y quitar el script `test:filtro`**

```bash
git rm scripts/test-filtrar-animales.ts
```
En `package.json` quitar la línea `"test:filtro": "tsx scripts/test-filtrar-animales.ts"`.

- [ ] **Step 3: Correr** — `npm run test:unit` → Expected: pasan calculadora + filtrar-animales.

- [ ] **Step 4: Commit** — `git commit -m "test(unit): reubicar filtrar-animales a node:test"`

---

### Task 19: tests/unit/pdf-render.test.ts (blinda BUG-3)

**Files:**
- Create: `tests/unit/pdf-render.test.ts`

- [ ] **Step 1: Escribir el test (render Node de ambos PDFs)**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import * as RP from '@react-pdf/renderer';
import ReporteSocioPDF from '../../src/components/pdf/ReporteSocioPDF';
import ReporteLotePDF from '../../src/components/pdf/ReporteLotePDF';

const lote: any = {
  id: 'L1', nombreLote: 'Nelore Socio', fechaCompra: '2026-01-14',
  tipoPropiedad: 'medias', socio: { nombre: 'Esteban Chaves', porcentaje: 50 },
  utilidadTotal: 250000, totalInvertido: 1740000, totalGastos: 60000, totalVentas: 700000,
};
const animales: any[] = [{ id: 'a1', estado: 'activo', numeroArete: 'NS-001', raza: 'Nelore', pesoInicial: 320, pesoActual: 410 }];
const ventas: any[] = [{ id: 'v1', fecha: '2026-04-10', cantidadAnimales: 1, totalVenta: 700000, utilidadBruta: 250000, utilidadSocio: 125000 }];
const gastos: any[] = [{ id: 'g1', fecha: '2026-03-15', concepto: 'Desparasitante', tipo: 'veterinario', monto: 60000 }];

async function render(el: any): Promise<Buffer> {
  return typeof (RP as any).renderToBuffer === 'function'
    ? await (RP as any).renderToBuffer(el)
    : await (RP as any).pdf(el).toBuffer();
}

test('ReporteSocioPDF renderiza un PDF válido (sin fuente remota)', async () => {
  const buf = await render(createElement(ReporteSocioPDF as any, {
    lote, animales, ventas, gastos, nombreFinca: 'El Roble', nombreDueno: 'Tester', fechaGenerado: '2026-06-02',
  }));
  assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(buf.length > 1000);
});

test('ReporteLotePDF renderiza un PDF válido', async () => {
  const buf = await render(createElement(ReporteLotePDF as any, {
    lote, animales, ventas, gastos, nombreFinca: 'El Roble', fechaGenerado: '2026-06-02',
  }));
  assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-');
});
```

Nota: confirmar las props de `ReporteLotePDF` (`ReporteLotePDFProps`) — no lleva `nombreDueno`. Ajustar el objeto si difiere.

- [ ] **Step 2: Correr** — `npm run test:unit` → Expected: ambos render `%PDF-`. (Con el bug viejo de Roboto, el de socio fallaría.)

- [ ] **Step 3: Commit** — `git commit -m "test(unit): render PDF Lote+Socio (regresión BUG-3)"`

---

## Fase 5 — Limpieza y docs

### Task 20: Eliminar suites viejas + actualizar docs

**Files:**
- Delete: `tests/qa/` (todo), `tests/responsive/` (todo), `playwright.responsive.config.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Borrar lo viejo**

```bash
git rm -r tests/qa tests/responsive playwright.responsive.config.ts
```

- [ ] **Step 2: Verificar la suite completa**

Run:
```bash
npm run test:unit
npm run test:e2e
```
Expected: unit verde; e2e verde (desktop) + responsive (mobile) verde.

- [ ] **Step 3: Actualizar `CLAUDE.md`**

En la sección de estructura/tests, reemplazar la mención de `tests/responsive/` y `playwright.responsive.config.ts` por:
```
- tests/e2e/ — suite E2E sobre Firebase Emulator (Firestore+Auth); `npm run test:e2e`
  (requiere JDK 17). Datos sembrados por scripts/seed-emulator.ts (fixtures en tests/e2e/fixtures.ts).
- tests/unit/ — tests Node rápidos (cálculos, filtro, render PDF); `npm run test:unit`.
- App Check bloquea navegadores automatizados → los E2E usan el emulador (sin App Check).
- firebase.json define los emuladores; firebase.ts conecta con VITE_USE_EMULATOR (.env.test).
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(e2e): eliminar suites pre-migración + actualizar CLAUDE.md"
```

---

## Cierre

- [ ] **PR**

```bash
git push -u origin test/modernizar-suite-e2e
gh pr create --base main --title "test: modernizar suite E2E con Firebase Emulator" --body "Reemplaza las suites Playwright pre-migración por E2E determinista sobre emulador Firestore+Auth + tests Node (cálculos/PDF). Local-first. Requiere JDK 17 para test:e2e."
```
No mergear sin revisión de José (flujo PR).
