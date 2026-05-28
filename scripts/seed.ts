import { db, TEST_USER_ID } from './firebase-admin';
import { generateSeedData } from './seed-data';

async function seed() {
  console.log(`\n🌱 Iniciando seeding para userId: ${TEST_USER_ID}\n`);
  const { fincas, lotes, animales, gastos, pesajes, ventas } = generateSeedData(TEST_USER_ID);

  const allDocs: { collection: string; id: string; data: object }[] = [
    ...fincas.map(d => ({ collection: 'fincas', id: d.id, data: d })),
    ...lotes.map(d => ({ collection: 'lotes', id: d.id, data: d })),
    ...animales.map(d => ({ collection: 'animales', id: d.id, data: d })),
    ...gastos.map(d => ({ collection: 'gastos', id: d.id, data: d })),
    ...pesajes.map((d: any) => ({ collection: 'pesos', id: d.id, data: d })),
    ...ventas.map(d => ({ collection: 'ventas', id: d.id, data: d })),
  ];

  const total = allDocs.length;
  console.log(`📦 Documentos a insertar: ${total}`);
  console.log(`   - Fincas:   ${fincas.length}`);
  console.log(`   - Lotes:    ${lotes.length}`);
  console.log(`   - Animales: ${animales.length}`);
  console.log(`   - Gastos:   ${gastos.length}`);
  console.log(`   - Pesajes:  ${pesajes.length}`);
  console.log(`   - Ventas:   ${ventas.length}\n`);

  const CHUNK_SIZE = 490;
  let batchNum = 1;
  for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
    const chunk = allDocs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const { collection, id, data } of chunk) {
      batch.set(db.collection(collection).doc(id), data);
    }
    await batch.commit();
    console.log(`✓ Batch ${batchNum++}: ${chunk.length} documentos escritos`);
  }

  console.log('\n✅ Seeding completado exitosamente\n');
}

seed().catch((err) => {
  console.error('❌ Error en seeding:', err);
  process.exit(1);
});
