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
