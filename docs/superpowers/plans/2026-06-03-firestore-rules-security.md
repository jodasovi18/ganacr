# Seguridad de reglas Firestore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer `firestore.rules` (inmutabilidad de `userId` + sanity de tipos + tope de tamaño) y cubrirlas con tests automatizados contra el emulador.

**Architecture:** TDD con `@firebase/rules-unit-testing` corriendo sobre el emulador Firestore (vía `firebase emulators:exec`). Los tests prueban el aislamiento entre usuarios y los nuevos invariantes; las reglas se endurecen para pasarlos. La suite E2E existente sirve de verificación cruzada de que no se rompieron escrituras reales.

**Tech Stack:** Firestore Security Rules, `@firebase/rules-unit-testing`, `node:test` + tsx, Firebase Emulator. Requiere **JDK 17**. En entorno con SSL corporativo: `NODE_TLS_REJECT_UNAUTHORIZED=0`.

---

## Estructura de archivos
- `package.json` — devDep `@firebase/rules-unit-testing` + script `test:rules`
- `tests/rules/firestore-rules.test.ts` (NUEVO) — tests de las reglas
- `firestore.rules` — endurecido
- `CLAUDE.md` — nota de seguridad

---

### Task 1: Dependencia + script `test:rules`

**Files:** Modify `package.json`

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install -D @firebase/rules-unit-testing@^3`
Expected: se agrega a devDependencies sin errores.

- [ ] **Step 2: Agregar el script** — en `package.json` → `scripts`, agregar después de `"test:e2e": ...`:
```json
"test:rules": "firebase emulators:exec --only firestore --project ganacr \"node --import tsx --test tests/rules/firestore-rules.test.ts\"",
```

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "test(rules): @firebase/rules-unit-testing devDep + script test:rules"
```

---

### Task 2: Tests de las reglas (TDD)

**Files:** Create `tests/rules/firestore-rules.test.ts`

- [ ] **Step 1: Escribir los tests**
```ts
import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'ganacr';
const UID_A = 'user-a';
const UID_B = 'user-b';
const NOW = '2026-06-03T00:00:00.000Z';

const COLECCIONES = ['users','fincas','lotes','animales','pesos','gastos','gastosFinca','eventosSanitarios','ventas'];

// users usa el uid como docId; el resto usa un id derivado
function docId(col: string, userId: string) {
  return col === 'users' ? userId : `${col}-de-${userId}`;
}

// doc base VÁLIDO por colección (pasa las nuevas validaciones)
function docBase(col: string, userId: string): any {
  const base: any = { userId, createdAt: NOW, updatedAt: NOW };
  switch (col) {
    case 'users':             return { id: userId, email: 'x@x.com', nombre: 'X', createdAt: NOW };
    case 'fincas':            return { ...base, nombre: 'Finca' };
    case 'lotes':             return { ...base, nombreLote: 'L', tipoPropiedad: 'propio', socio: null, totalInvertido: 0, fincaId: 'f' };
    case 'animales':          return { ...base, numeroArete: 'A1', estado: 'activo', pesoActual: 100, precioCompra: 0, fincaId: 'f', loteId: 'l' };
    case 'pesos':             return { ...base, peso: 100, animalId: 'a', loteId: 'l', fincaId: 'f' };
    case 'gastos':            return { ...base, monto: 1000, tipo: 'alimento', fincaId: 'f', loteId: 'l' };
    case 'gastosFinca':       return { ...base, montoTotal: 1000, fincaId: 'f' };
    case 'eventosSanitarios': return { ...base, costo: 1000, fincaId: 'f', loteId: 'l' };
    case 'ventas':            return { ...base, totalVenta: 1000, fincaId: 'f', loteId: 'l' };
    default:                  return base;
  }
}

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }, // conecta vía FIRESTORE_EMULATOR_HOST (lo setea emulators:exec)
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// Precarga el doc de B saltando las reglas
async function seedDeB(col: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), col, docId(col, UID_B)), docBase(col, UID_B));
  });
}

// ── Aislamiento: A no puede tocar datos de B (parametrizado) ──
for (const col of COLECCIONES) {
  test(`aislamiento: A no lee ${col} de B`, async () => {
    await seedDeB(col);
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(getDoc(doc(dbA, col, docId(col, UID_B))));
  });
  test(`aislamiento: A no borra ${col} de B`, async () => {
    await seedDeB(col);
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(deleteDoc(doc(dbA, col, docId(col, UID_B))));
  });
  test(`aislamiento: A no crea ${col} con userId de B`, async () => {
    const dbA = env.authenticatedContext(UID_A).firestore();
    await assertFails(setDoc(doc(dbA, col, docId(col, UID_B)), docBase(col, UID_B)));
  });
  test(`sin auth: no lee ${col}`, async () => {
    await seedDeB(col);
    const dbN = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(dbN, col, docId(col, UID_B))));
  });
}

// ── Dueño feliz ──
test('dueño: A crea y lee su lote', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertSucceeds(setDoc(doc(dbA, 'lotes', 'l-a'), docBase('lotes', UID_A)));
  await assertSucceeds(getDoc(doc(dbA, 'lotes', 'l-a')));
});
test('dueño: A crea su animal', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertSucceeds(setDoc(doc(dbA, 'animales', 'an-a'), docBase('animales', UID_A)));
});

// ── Inmutabilidad de userId ──
test('inmutabilidad: A no puede cambiar el userId de su lote', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'lotes', 'l1'), docBase('lotes', UID_A));
  });
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(updateDoc(doc(dbA, 'lotes', 'l1'), { userId: UID_B }));
});

// ── Tipos / enum inválidos ──
test('tipos: animal con pesoActual no-número → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(setDoc(doc(dbA, 'animales', 'an1'), { ...docBase('animales', UID_A), pesoActual: 'cien' }));
});
test('enum: lote con tipoPropiedad inválido → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  await assertFails(setDoc(doc(dbA, 'lotes', 'l2'), { ...docBase('lotes', UID_A), tipoPropiedad: 'otro' }));
});

// ── Tope de tamaño ──
test('tamaño: doc con demasiados campos → denegado', async () => {
  const dbA = env.authenticatedContext(UID_A).firestore();
  const gordo: any = { ...docBase('lotes', UID_A) };
  for (let i = 0; i < 45; i++) gordo[`extra${i}`] = i;
  await assertFails(setDoc(doc(dbA, 'lotes', 'l3'), gordo));
});
```

- [ ] **Step 2: Correr contra las reglas ACTUALES (TDD rojo)** — Run: `npm run test:rules`
Expected: los tests de **aislamiento / sin-auth / dueño** pasan, pero los de **inmutabilidad, tipos/enum y tamaño FALLAN** (las reglas actuales aún los permiten). Eso confirma que los tests detectan los huecos.

- [ ] **Step 3: Commit (tests primero)**
```bash
git add tests/rules/firestore-rules.test.ts
git commit -m "test(rules): suite de aislamiento + invariantes (TDD, falla contra reglas actuales)"
```

---

### Task 3: Endurecer `firestore.rules`

**Files:** Modify `firestore.rules` (reemplazar todo el contenido)

- [ ] **Step 1: Reescribir las reglas**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function autenticado()      { return request.auth != null; }
    function esDueno()          { return autenticado() && resource.data.userId == request.auth.uid; }
    function creandoComoDueno() { return autenticado() && request.resource.data.userId == request.auth.uid; }
    function userIdInmutable()  { return request.resource.data.userId == resource.data.userId; }
    function tamanoOk()         { return request.resource.data.size() <= 40; }
    function d()                { return request.resource.data; }

    // Validaciones por colección: set chico de campos críticos (no espeja el esquema)
    function fincaValida()      { return d().nombre is string; }
    function loteValido()       { return d().tipoPropiedad in ['propio','medias'] && d().totalInvertido is number; }
    function animalValido()     { return d().estado in ['activo','vendido','muerto'] && d().pesoActual is number && d().precioCompra is number; }
    function pesoValido()       { return d().peso is number; }
    function gastoValido()      { return d().monto is number; }
    function gastoFincaValido() { return d().montoTotal is number; }
    function eventoValido()     { return d().costo is number; }
    function ventaValida()      { return d().totalVenta is number; }

    // users: keyed por uid (no tiene campo userId)
    match /users/{userId} {
      allow read, delete:   if autenticado() && request.auth.uid == userId;
      allow create, update: if autenticado() && request.auth.uid == userId
        && tamanoOk() && d().email is string && d().nombre is string;
    }

    match /fincas/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && fincaValida();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && fincaValida();
    }
    match /lotes/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && loteValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && loteValido();
    }
    match /animales/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && animalValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && animalValido();
    }
    match /pesos/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && pesoValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && pesoValido();
    }
    match /gastos/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && gastoValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && gastoValido();
    }
    match /gastosFinca/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && gastoFincaValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && gastoFincaValido();
    }
    match /eventosSanitarios/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && eventoValido();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && eventoValido();
    }
    match /ventas/{id} {
      allow read, delete: if esDueno();
      allow create:       if creandoComoDueno() && tamanoOk() && ventaValida();
      allow update:       if esDueno() && userIdInmutable() && tamanoOk() && ventaValida();
    }
  }
}
```

- [ ] **Step 2: Correr los tests de reglas (TDD verde)** — Run: `npm run test:rules`
Expected: **todos** los tests pasan (aislamiento + inmutabilidad + tipos + tamaño).

- [ ] **Step 3: Commit**
```bash
git add firestore.rules
git commit -m "feat(rules): endurecer reglas (userId inmutable + sanity de tipos + tope de tamano)"
```

---

### Task 4: Verificación cruzada con E2E

- [ ] **Step 1: Correr la suite E2E** — Run: `npm run test:e2e`
Expected: **20/20 en verde**. La app escribe datos reales (crear lote, agregar animal, vender, mover, muerte, gasto-finca, sanidad) contra el emulador con las reglas endurecidas. Si algo falla, una regla quedó demasiado estricta → revisar la `valido()` de esa colección contra lo que escribe el hook correspondiente y aflojarla.

> Nota: `test:rules` y `test:e2e` usan ambos el emulador; correrlos requiere JDK 17 (+ `NODE_TLS_REJECT_UNAUTHORIZED=0` tras el proxy corporativo).

---

### Task 5: Documentar

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Agregar nota de seguridad** — en la sección de tests/estructura de `CLAUDE.md`, agregar:
```
- `tests/rules/` — tests de las reglas Firestore (`@firebase/rules-unit-testing`); `npm run test:rules`
  (requiere JDK 17). Reglas endurecidas: owner-only + userId inmutable + sanity de tipos + tope de
  tamaño. El E2E sirve de verificación cruzada de que las reglas no rompen escrituras reales.
- **IMPORTANTE:** tras cambiar `firestore.rules`, deployar con `firebase deploy --only firestore:rules`
  (las reglas viven en prod; sin deploy, el cambio no aplica).
```

- [ ] **Step 2: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: tests de reglas Firestore + recordatorio de deploy"
```

---

## Cierre
- [ ] **PR** — `git push -u origin security/firestore-rules-hardening` + `gh pr create --base main --title "security: endurecer reglas Firestore + tests"`. En el cuerpo, recordar a José: **deployar las reglas** (`firebase deploy --only firestore:rules`) tras mergear. No mergear sin revisión.
