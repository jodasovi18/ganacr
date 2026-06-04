// scripts/backup-admin.ts — Admin SDK para backup/restore (env-detecting).
// Detecta el entorno: emulador (FIRESTORE_EMULATOR_HOST) vs producción (service-account.json).
// A diferencia de firebase-admin.ts, NO exige TEST_USER_ID (este script opera sobre toda la base).
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { COLECCIONES } from './backup-format';

const PROJECT_ID = 'ganacr';
const usandoEmulador = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  if (usandoEmulador) {
    // Emulador: sin credenciales (lo usan los tests).
    admin.initializeApp({ projectId: PROJECT_ID });
  } else {
    // Producción: bypass de SSL corporativo + credenciales de servicio.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const saPath = resolve(process.cwd(), 'scripts/service-account.json');
    const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

export const db = admin.firestore();
if (!usandoEmulador) db.settings({ preferRest: true }); // REST para evitar SSL corporativo (solo prod)

export { PROJECT_ID, usandoEmulador, COLECCIONES };
