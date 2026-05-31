/**
 * clean-demo-fields.ts — elimina los campos espurios `id` y `_testData` de todos
 * los documentos del usuario demo. Idempotente. Uso: npm run clean-demo
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
  console.log('\n🧹  Limpieza de campos basura del demo\n');
  const auth = admin.auth();
  const demo = await auth.getUserByEmail(DEMO_EMAIL);
  const demoUid = demo.uid;
  console.log('Demo UID:', demoUid, '\n');

  let totalLimpiados = 0;
  for (const col of COLECCIONES) {
    const snap = await db.collection(col).where('userId', '==', demoUid).get();
    const sucios = snap.docs.filter((d) => {
      const data = d.data();
      return 'id' in data || '_testData' in data;
    });
    for (let i = 0; i < sucios.length; i += 490) {
      const chunk = sucios.slice(i, i + 490);
      const batch = db.batch();
      for (const d of chunk) {
        batch.update(d.ref, {
          id: admin.firestore.FieldValue.delete(),
          _testData: admin.firestore.FieldValue.delete(),
        });
      }
      await batch.commit();
    }
    console.log(`  ${col}: ${sucios.length} limpiados (de ${snap.size})`);
    totalLimpiados += sucios.length;
  }

  // users/{demoUid}
  const userRef = db.collection('users').doc(demoUid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const ud = userSnap.data()!;
    if ('id' in ud || '_testData' in ud) {
      await userRef.update({
        id: admin.firestore.FieldValue.delete(),
        _testData: admin.firestore.FieldValue.delete(),
      });
      console.log('  users: 1 limpiado');
      totalLimpiados += 1;
    }
  }

  console.log(`\n✅  Total: ${totalLimpiados} documentos limpiados\n`);
  process.exit(0);
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
