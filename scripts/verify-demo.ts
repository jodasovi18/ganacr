/**
 * verify-demo.ts
 * Diagnostica el usuario demo: verifica que los fincaIds en lotes
 * coincidan con los IDs de los documentos en la colección fincas.
 * Si hay discrepancias, las corrige en Firestore.
 *
 * Uso: npm run verify-demo
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const serviceAccountPath = resolve(process.cwd(), 'scripts/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
db.settings({ preferRest: true });

const DEMO_EMAIL = 'demo@ganacr.com';

async function main() {
  console.log('\n🔍  GanaCR — Diagnóstico usuario demo\n');

  // 1. Obtener el UID del demo
  const auth = admin.auth();
  let demoUid: string;
  try {
    const user = await auth.getUserByEmail(DEMO_EMAIL);
    demoUid = user.uid;
    console.log(`👤  Demo UID: ${demoUid}\n`);
  } catch {
    console.error(`❌  No existe el usuario ${DEMO_EMAIL}`);
    process.exit(1);
  }

  // 2. Obtener fincas del demo
  const fincasSnap = await db.collection('fincas').where('userId', '==', demoUid).get();
  const fincaIds = new Set(fincasSnap.docs.map(d => d.id));
  console.log(`📂  Fincas del demo (${fincasSnap.docs.length}):`);
  fincasSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`    ${d.id} → "${data.nombre}" (userId: ${data.userId})`);
  });

  // 3. Obtener lotes del demo
  const lotesSnap = await db.collection('lotes').where('userId', '==', demoUid).get();
  console.log(`\n📦  Lotes del demo (${lotesSnap.docs.length}):`);

  const lotesConFincaIdMal: { id: string; fincaIdActual: string | undefined }[] = [];
  lotesSnap.docs.forEach(d => {
    const data = d.data();
    const fincaIdOk = fincaIds.has(data.fincaId);
    console.log(`    ${d.id} → fincaId: "${data.fincaId}" ${fincaIdOk ? '✅' : '❌ NO coincide'}`);
    if (!fincaIdOk) {
      lotesConFincaIdMal.push({ id: d.id, fincaIdActual: data.fincaId });
    }
  });

  // 4. Verificar animales, gastos, ventas
  const animalesSnap = await db.collection('animales').where('userId', '==', demoUid).get();
  const animalesConError = animalesSnap.docs.filter(d => !fincaIds.has(d.data().fincaId));
  console.log(`\n🐄  Animales: ${animalesSnap.docs.length} total, ${animalesConError.length} con fincaId inválido`);

  const gastosSnap = await db.collection('gastos').where('userId', '==', demoUid).get();
  const gastosConError = gastosSnap.docs.filter(d => !fincaIds.has(d.data().fincaId));
  console.log(`💸  Gastos:   ${gastosSnap.docs.length} total, ${gastosConError.length} con fincaId inválido`);

  // 5. Resumen
  console.log('\n─────────────────────────────────────────');
  if (lotesConFincaIdMal.length === 0 && animalesConError.length === 0 && gastosConError.length === 0) {
    console.log('✅  Todo correcto. Los fincaIds coinciden con los documentos de fincas.');
    console.log('    El problema puede ser un Firestore index no deployado.');
    console.log('    Corré: firebase deploy --only firestore:indexes\n');
  } else {
    console.log(`❌  Hay ${lotesConFincaIdMal.length} lotes, ${animalesConError.length} animales, ${animalesConError.length} gastos con fincaId inválido.`);
    console.log('    El remapeo de IDs falló. Corré npm run copy-to-demo de nuevo.\n');
  }
}

main().catch(err => {
  console.error('❌  Error:', err);
  process.exit(1);
});
