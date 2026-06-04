# Diseño — Seguridad de reglas Firestore (hardening + tests)

**Fecha:** 2026-06-03
**Tipo:** Seguridad / infraestructura
**Estado:** Aprobado (pendiente review del spec → writing-plans)
**Rama:** `security/firestore-rules-hardening` (off main; main ya tiene el emulador).

## Resumen

Endurecer `firestore.rules` (más allá del owner-only actual) y cubrirlas con **tests
automatizados** usando `@firebase/rules-unit-testing` contra el emulador. TDD: los tests prueban
el aislamiento entre usuarios y los nuevos invariantes; las reglas se endurecen para pasarlos.

## Decisiones (brainstorming)

1. **Nivel de endurecimiento:** **inmutabilidad + sanity de tipos** (nivel 2). `userId` inmutable
   y siempre = `auth.uid`; tipos correctos en campos críticos; tope de tamaño. **NO** se espeja el
   esquema completo, **NO** validación cruzada con `get()`, **NO** rechazo de campos desconocidos.
2. **Enfoque:** TDD — endurecer reglas **y** tests juntos (en seguridad, tocar reglas sin tests es
   peligroso).
3. **Local-first:** corre con `npm run test:rules` (requiere JDK 17). CI = iniciativa aparte.

## Estado actual (firestore.rules)

Owner-only para las 9 colecciones: `read, write` y `create` permitidos solo si
`request.auth.uid == userId`. Aislamiento correcto, pero **sin** validación de contenido,
inmutabilidad de `userId`, ni tope de tamaño. **Sin tests.**

## Diseño de las reglas

`firestore.rules` reescrito con **funciones helper**:
```
function autenticado()      { return request.auth != null; }
function esDueno()          { return autenticado() && resource.data.userId == request.auth.uid; }
function creandoComoDueno() { return autenticado() && request.resource.data.userId == request.auth.uid; }
function userIdInmutable()  { return request.resource.data.userId == resource.data.userId; }
function tamanoOk()         { return request.resource.data.size() <= 40; } // anti-abuso (máx actual ~16)
```
Por colección, el `write` se separa en verbos:
```
allow read, delete: if esDueno();
allow create:       if creandoComoDueno() && tamanoOk() && valido<Coleccion>();
allow update:       if esDueno() && userIdInmutable() && tamanoOk() && valido<Coleccion>();
```
> En reglas Firestore, `request.resource.data` en un `update` es el documento **resultante**
> (merge), así que `valido()` aplica igual a create y update.

### `valido<Coleccion>()` — set chico de checks de alto valor (NO esquema completo)
Solo campos críticos para integridad/seguridad; permisivo con opcionales para no romper escrituras
reales:
- **users:** `data.email is string && data.nombre is string`
- **fincas:** `data.nombre is string`
- **lotes:** `data.tipoPropiedad in ['propio','medias'] && data.totalInvertido is number &&
  (data.socio == null || data.socio is map)`
- **animales:** `data.estado in ['activo','vendido','muerto'] && data.pesoActual is number &&
  data.precioCompra is number`
- **pesos:** `data.peso is number`
- **gastos:** `data.monto is number`
- **gastosFinca:** `data.montoTotal is number`
- **eventosSanitarios:** `data.costo is number`
- **ventas:** `data.totalVenta is number`

(`data` = `request.resource.data`.) Las firmas exactas se confirman contra los hooks durante la
implementación; la suite E2E (abajo) es el guardarraíl que avisa si quedaron demasiado estrictas.

## Tests (`tests/rules/firestore-rules.test.ts`)

Con `@firebase/rules-unit-testing` (`initializeTestEnvironment`, `assertSucceeds`, `assertFails`)
contra el emulador Firestore (las reglas se cargan de `firestore.rules`). Casos:
1. **Aislamiento (parametrizado sobre las 9 colecciones):** usuario A no puede **leer, actualizar,
   borrar ni crear** docs cuyo `userId` es de B.
2. **Sin autenticar:** read/write denegado en todas.
3. **Dueño feliz:** crea/lee/actualiza/borra sus propios docs ✅.
4. **Inmutabilidad:** update que cambia `userId` a otro → denegado.
5. **Create con `userId` ajeno** (≠ auth.uid) → denegado.
6. **Tipos/enum inválidos:** create de animal con `pesoActual: "x"` o `estado: "z"` → denegado;
   lote con `tipoPropiedad: "otro"` → denegado.
7. **Tamaño:** doc con > 40 campos → denegado.

Helper de seed: usar `ctx.firestore()` con `withFunctionTriggersDisabled` o
`env.withSecurityRulesDisabled` para precargar docs de B (sin pasar por reglas) y luego probar el
acceso de A.

## Runner y dependencias

- Dep nueva: **`@firebase/rules-unit-testing`** (devDep).
- Script: **`npm run test:rules`** = `firebase emulators:exec --only firestore --project ganacr
  "node --import tsx --test tests/rules/firestore-rules.test.ts"`.
- En entorno con SSL corporativo: `NODE_TLS_REJECT_UNAUTHORIZED=0` (igual que el resto).

## 🛡️ Verificación cruzada (clave)

La **suite E2E (`npm run test:e2e`, 20 tests)** escribe datos reales por la app contra el emulador.
Tras endurecer las reglas, se corre el E2E: si alguna validación quedó demasiado estricta y rompe
una escritura legítima, **el E2E falla** → señal inequívoca de regla mal calibrada. Es el guardarraíl
de que no rompimos nada real.

## Fuera de alcance

- CI / GitHub Actions (iniciativa aparte).
- Validación cruzada con `get()` (que el `fincaId`/`loteId` referencien docs del dueño) — nivel
  estricto.
- Rechazo de campos desconocidos (whitelisting).
- Otras capas de seguridad (headers, backups, pentest) — son iniciativas separadas del análisis.

## Entregable

- `firestore.rules` endurecido (helpers + `valido()` por colección).
- `tests/rules/firestore-rules.test.ts` + `@firebase/rules-unit-testing` devDep + script `test:rules`.
- E2E sigue en verde (verificación cruzada).
- `firebase deploy --only firestore:rules` lo hace José tras revisar el PR (las reglas viven en prod).
- PR dedicado (rama `security/firestore-rules-hardening`).
