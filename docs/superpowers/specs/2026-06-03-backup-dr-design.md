# Diseño — Respaldo y recuperación de datos (DR)

**Fecha:** 2026-06-03
**Tipo:** Ops / infraestructura de datos
**Estado:** Aprobado (pendiente review del spec → writing-plans)
**Rama:** `ops/backup-dr` (off main).

## Resumen

Respaldo de los datos de GanaCR en **formato abierto off-cloud**, restaurable, como seguro ante
el caso extremo de que Firestore falle/desaparezca. Tres scripts (export / import / verify) +
runbook + test de round-trip contra el emulador. **Solo datos Firestore** (no Firebase Auth).

## Decisiones (brainstorming)

1. **Alcance:** export + import + verify (scripts) + runbook. Respaldo completo y **restaurable**.
2. **Contenido:** **solo las 9 colecciones Firestore** (incluido el perfil en `users`). **NO** se
   exportan las cuentas/credenciales de Firebase Auth (evita hashes de contraseña off-cloud; los
   datos son lo irremplazable, Auth es recuperable).
3. **Enfoque:** scripts Admin SDK reusando el patrón de `copy-to-demo`. El export nativo a GCS
   (gestionado, formato propietario) se documenta en el runbook como capa complementaria.

## Arquitectura

Scripts tsx con `firebase-admin`. Colecciones:
`users, fincas, lotes, animales, pesos, gastos, gastosFinca, eventosSanitarios, ventas`.

### `scripts/backup-admin.ts` (NUEVO)
Init de Admin SDK **sin** la dependencia de `TEST_USER_ID` (a diferencia de `firebase-admin.ts`),
con detección de entorno:
- Si `process.env.FIRESTORE_EMULATOR_HOST` está definido → `initializeApp({ projectId: 'ganacr' })`
  (apunta al **emulador**; lo usan los tests).
- Si no → lee `scripts/service-account.json` + `NODE_TLS_REJECT_UNAUTHORIZED=0` →
  `initializeApp({ credential: cert(...) })` + `db.settings({ preferRest: true })` (**prod**).
- Exporta `db` y `COLECCIONES` (el array de arriba).

### `scripts/export-backup.ts` (NUEVO) — `npm run backup:export`
- Exporta `exportBackup(destDir?)` + wrapper CLI.
- Lee cada colección completa (`db.collection(col).get()`), escribe a `backups/<timestamp>/`:
  - `<colección>.ndjson` — un doc por línea: `{"id":"<docId>","data":{...}}`.
  - `manifest.json` — `{ generadoEn, projectId, colecciones: { <col>: <n>, ... }, totalDocs }`.
- Imprime el resumen (conteos por colección + total).

### `scripts/import-backup.ts <dir>` (NUEVO) — `npm run backup:import -- <dir>`
- Exporta `importBackup(dir, { force })` + wrapper CLI (lee `dir` de `process.argv`, `--force` flag).
- Lee cada `<colección>.ndjson`, re-crea los docs vía `batch.set(db.collection(col).doc(id), data)`
  en lotes de 490.
- **Salvaguarda:** antes de escribir, cuenta los docs existentes en el destino; si alguna colección
  NO está vacía y no se pasó `--force`, **aborta** con un mensaje claro (evita pisar prod/datos por
  accidente). Para DR, se apunta el `service-account.json` a un **proyecto nuevo** y se corre normal.

### `scripts/verify-backup.ts <dir>` (NUEVO) — `npm run backup:verify -- <dir>`
- Lee el `manifest.json` y cada `<colección>.ndjson`; parsea línea por línea (valida JSON), cuenta,
  y **compara los conteos reales contra el manifest**. Falla (exit 1) si hay discrepancia o JSON
  corrupto. Verifica la **integridad** del backup en disco.

### `.gitignore`
Agregar `backups/` — los respaldos contienen datos personales, **no** se versionan.

## Formato (abierto, portable)
NDJSON (un JSON por línea) por colección + `manifest.json`. Streamable, diff-able, y re-importable a
**cualquier** backend (no solo Firestore) si algún día se migra — ese es el seguro del caso extremo.

## Testing — round-trip contra el emulador

`tests/backup/round-trip.test.ts` (`node:test`), corre bajo
`firebase emulators:exec --only firestore --project ganacr`:
1. Siembra el emulador con unos docs en varias colecciones (vía `backup-admin` → emulador).
2. `exportBackup(tmpDir)`.
3. Limpia el emulador (REST clear, como en `seed-emulator`).
4. `importBackup(tmpDir)`.
5. **Asserta que los conteos por colección coinciden con los originales** y que un doc concreto se
   restauró con su `id` + `data`.

Prueba que export+import funcionan de verdad **sin tocar prod**. Nuevo `npm run test:backup` =
`firebase emulators:exec --only firestore --project ganacr "node --import tsx --test tests/backup/round-trip.test.ts"`.

## Runbook — `docs/runbook-respaldo-dr.md` (NUEVO)
1. **Export off-cloud:** correr `npm run backup:export`, guardar el dir `backups/<ts>/` **fuera de
   GCP** (cifrado, otro proveedor/disco), con una frecuencia definida (ej. semanal).
2. **Restaurar:** apuntar `service-account.json` a un proyecto nuevo y correr
   `npm run backup:import -- <dir>`.
3. **Capas gestionadas a activar en la consola** (complementarias): **PITR** de Firestore (rollback
   continuo) + **backups programados** a GCS.
4. **Simulacro de restauración** periódico (checklist) — un backup que nunca restauraste no es un
   backup.

## Fuera de alcance
- Export user-facing "mis datos" (follow-up).
- Backup de Firebase Auth (decidido: no).
- Automatización del cron/scheduler (lo corre el operador; queda en el runbook).
- Migración real a otro backend (el formato abierto la habilita, pero es un proyecto aparte).

## Entregable
- `scripts/backup-admin.ts`, `export-backup.ts`, `import-backup.ts`, `verify-backup.ts` + scripts npm.
- `tests/backup/round-trip.test.ts` + `npm run test:backup`.
- `docs/runbook-respaldo-dr.md`. `.gitignore` con `backups/`.
- PR dedicado (rama `ops/backup-dr`).
