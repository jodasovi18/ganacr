import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const serviceAccountPath = resolve(process.cwd(), 'scripts/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();

export const TEST_USER_ID: string = process.env.TEST_USER_ID ?? '';

if (!TEST_USER_ID) {
  console.error('ERROR: TEST_USER_ID no está definido en .env');
  process.exit(1);
}
