/**
 * wipe-demo.ts — BORRA TODOS los documentos del usuario demo en todas las colecciones.
 * Pensado para usarse junto a copy-to-demo (wipe → copy-to-demo → clean-demo) para dejar
 * el demo en estado pristino. Solo afecta a demo@ganacr.com (lookup por email, no hardcode).
 *
 * Uso: npm run wipe-demo
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccount = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/service-account.json'), 'utf8')
);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
db.settings({ preferRest: true });

const DEMO_EMAIL = 'demo@ganacr.com';
const COLECCIONES = [
  'fincas', 'lotes', 'animales', 'pesos', 'gastos',
  'gastosFinca', 'ventas', 'eventosSanitarios',
];

async function main() {
  console.log('\n🗑️   Wipe del usuario demo (todas las colecciones)\n');
  const demo = await admin.auth().getUserByEmail(DEMO_EMAIL);
  const demoUid = demo.uid;
  console.log('Demo UID:', demoUid, '\n');

  let total = 0;
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).where('userId', '==', demoUid).get();
    for (let i = 0; i < snap.docs.length; i += 490) {
      const batch = db.batch();
      snap.docs.slice(i, i + 490).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`  ${col}: ${snap.size} borrados`);
    total += snap.size;
  }
  console.log(`\n✅  Total borrados: ${total}\n`);
  process.exit(0);
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
