import { db, TEST_USER_ID } from './firebase-admin';

const COLLECTIONS = ['lotes', 'animales', 'gastos', 'pesos', 'ventas'];

async function cleanup() {
  console.log(`\n🧹 Limpiando datos de prueba para userId: ${TEST_USER_ID}\n`);
  let totalDeleted = 0;

  for (const col of COLLECTIONS) {
    const snapshot = await db
      .collection(col)
      .where('userId', '==', TEST_USER_ID)
      .get();

    if (snapshot.empty) {
      console.log(`   ${col}: 0 documentos`);
      continue;
    }

    const CHUNK_SIZE = 490;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      docs.slice(i, i + CHUNK_SIZE).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`   ✓ ${col}: ${docs.length} documentos eliminados`);
    totalDeleted += docs.length;
  }

  console.log(`\n✅ Cleanup completado. Total eliminados: ${totalDeleted}\n`);
}

cleanup().catch((err) => {
  console.error('❌ Error en cleanup:', err);
  process.exit(1);
});
