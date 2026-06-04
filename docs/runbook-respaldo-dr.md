# Runbook — Respaldo y Recuperación de Datos (DR)

Seguro ante el caso extremo de que Firestore falle o desaparezca. Respalda **solo datos Firestore**
(las 9 colecciones). **No** respalda Firebase Auth (las cuentas se recrean; no se sacan hashes de
contraseña off-cloud).

## 1. Respaldo off-cloud (manual/periódico)

Requisitos: Node + `scripts/service-account.json` (privilegiado — gitignored, nunca compartir).

```bash
npm run backup:export
```

Genera `backups/<timestamp>/` con un `.ndjson` por colección + `manifest.json` (conteos).
**Guardar ese directorio FUERA de Google Cloud** (disco cifrado, otro proveedor), idealmente
**semanal**. Verificar integridad del backup en disco:

```bash
npm run backup:verify -- backups/<timestamp>
```

## 2. Restaurar (DR)

1. Crear/elegir un proyecto Firebase **vacío** y descargar su `service-account.json` a `scripts/`.
2. Restaurar:
   ```bash
   npm run backup:import -- backups/<timestamp>
   ```
   El import **aborta si el destino ya tiene datos** (salvaguarda anti-pisado). Para sobrescribir
   intencionalmente: agregar `--force`.
3. Re-crear las cuentas de Auth de los usuarios (registro normal o consola de Firebase) y desplegar
   reglas: `firebase deploy --only firestore:rules`.

## 3. Capas gestionadas a activar en la consola (complementarias)

En la consola de Firebase/GCP, además del export off-cloud:

- **PITR (Point-in-Time Recovery)** de Firestore: rollback continuo a cualquier instante de los
  últimos días. Protege contra borrados/corrupción accidental.
- **Backups programados** de Firestore a un bucket **GCS**: respaldo gestionado, retención
  configurable. Es la capa "en la nube" que complementa el export off-cloud.

## 4. Simulacro de restauración (periódico)

Un backup que nunca restauraste no es un backup. Cada cierto tiempo:

1. `npm run backup:export` (o tomar el último).
2. `npm run backup:verify -- <dir>`.
3. Restaurar a un proyecto **de prueba** vacío y revisar que la app levante con los datos.

El test automatizado `npm run test:backup` ejercita export→clear→import contra el emulador en cada
corrida (no toca prod) — es la red de seguridad de que los scripts siguen funcionando.

## Alcance / límites

- Solo Firestore (no Auth, no Storage).
- El cron/scheduler lo corre el operador (no automatizado en el repo).
- El formato NDJSON es abierto y re-importable a otro backend si algún día se migra.
