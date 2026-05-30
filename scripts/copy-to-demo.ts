/**
 * copy-to-demo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Copia TODOS los datos de un usuario real a un usuario demo de Firebase.
 *
 * Uso:
 *   1. Agregar SOURCE_USER_ID=<uid-real> al .env
 *   2. npm run copy-to-demo
 *
 * El usuario demo se crea (o reutiliza si ya existe) con:
 *   Email:      demo@ganacr.com
 *   Contraseña: GanaCR2026!
 *
 * Todos los IDs de documentos se regeneran (nuevos IDs únicos) y las
 * referencias cruzadas (fincaId, loteId, animalId) se remapean correctamente.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// ─── Configuración ───────────────────────────────────────────────────────────
const DEMO_EMAIL    = 'demo@ganacr.com';
const DEMO_PASSWORD = 'GanaCR2026!';
const DEMO_NOMBRE   = 'Usuario Demo';

const SOURCE_USER_ID = process.env.SOURCE_USER_ID ?? '';
if (!SOURCE_USER_ID) {
  console.error('\n❌  ERROR: SOURCE_USER_ID no está definido en .env');
  console.error('    Agregá SOURCE_USER_ID=<uid-del-usuario-real> al archivo .env\n');
  process.exit(1);
}

// ─── Firebase Admin ──────────────────────────────────────────────────────────
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const serviceAccountPath = resolve(process.cwd(), 'scripts/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db   = admin.firestore();
const auth = admin.auth();
db.settings({ preferRest: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function newId(): string {
  return db.collection('_').doc().id;
}

async function readCollection(
  col: string,
  userId: string
): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const snap = await db.collection(col).where('userId', '==', userId).get();
  return snap.docs;
}

async function writeBatches(
  docs: { collection: string; id: string; data: Record<string, unknown> }[]
): Promise<void> {
  const CHUNK = 490;
  let batchNum = 1;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const chunk = docs.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const { collection, id, data } of chunk) {
      batch.set(db.collection(collection).doc(id), data);
    }
    await batch.commit();
    console.log(`  ✓ Batch ${batchNum++}: ${chunk.length} documentos`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🐄  GanaCR — Copy to Demo User');
  console.log('─────────────────────────────────────────');
  console.log(`  Fuente: ${SOURCE_USER_ID}`);
  console.log(`  Destino: ${DEMO_EMAIL}\n`);

  // 1. Crear o recuperar usuario demo en Firebase Auth
  let demoUid: string;
  try {
    const existing = await auth.getUserByEmail(DEMO_EMAIL);
    demoUid = existing.uid;
    console.log(`👤  Usuario demo ya existe: ${demoUid}`);
  } catch {
    const created = await auth.createUser({
      email:       DEMO_EMAIL,
      password:    DEMO_PASSWORD,
      displayName: DEMO_NOMBRE,
    });
    demoUid = created.uid;
    console.log(`👤  Usuario demo creado: ${demoUid}`);
  }

  // 2. Leer todas las colecciones del usuario fuente
  console.log('\n📖  Leyendo datos del usuario fuente...');
  const [fincaDocs, loteDocs, animalDocs, pesoDocs,
         gastoDocs, gastoFincaDocs, ventaDocs, eventoDocs] = await Promise.all([
    readCollection('fincas',           SOURCE_USER_ID),
    readCollection('lotes',            SOURCE_USER_ID),
    readCollection('animales',         SOURCE_USER_ID),
    readCollection('pesos',            SOURCE_USER_ID),
    readCollection('gastos',           SOURCE_USER_ID),
    readCollection('gastosFinca',      SOURCE_USER_ID),
    readCollection('ventas',           SOURCE_USER_ID),
    readCollection('eventosSanitarios',SOURCE_USER_ID),
  ]);

  const counts = {
    fincas: fincaDocs.length, lotes: loteDocs.length, animales: animalDocs.length,
    pesos: pesoDocs.length, gastos: gastoDocs.length, gastosFinca: gastoFincaDocs.length,
    ventas: ventaDocs.length, eventosSanitarios: eventoDocs.length,
  };
  console.log(`  - Fincas:             ${counts.fincas}`);
  console.log(`  - Lotes:              ${counts.lotes}`);
  console.log(`  - Animales:           ${counts.animales}`);
  console.log(`  - Pesos:              ${counts.pesos}`);
  console.log(`  - Gastos (lote):      ${counts.gastos}`);
  console.log(`  - Gastos (finca):     ${counts.gastosFinca}`);
  console.log(`  - Ventas:             ${counts.ventas}`);
  console.log(`  - Eventos sanitarios: ${counts.eventosSanitarios}`);

  // Abortar si no se encontró nada — probablemente el SOURCE_USER_ID es incorrecto
  const totalSource = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalSource === 0) {
    console.error('\n❌  No se encontraron documentos para SOURCE_USER_ID:', SOURCE_USER_ID);
    console.error('    Verificá que el UID en .env coincide exactamente con el userId en Firestore.');
    process.exit(1);
  }

  const total = fincaDocs.length + loteDocs.length + animalDocs.length +
                pesoDocs.length + gastoDocs.length + gastoFincaDocs.length +
                ventaDocs.length + eventoDocs.length;
  console.log(`  Total: ${total} documentos\n`);

  // 3. Construir mapas de IDs: oldId → newId
  const fincaMap:  Record<string, string> = {};
  const loteMap:   Record<string, string> = {};
  const animalMap: Record<string, string> = {};
  const gastoFincaMap: Record<string, string> = {};

  for (const d of fincaDocs)     fincaMap[d.id]     = newId();
  for (const d of loteDocs)      loteMap[d.id]      = newId();
  for (const d of animalDocs)    animalMap[d.id]    = newId();
  for (const d of gastoFincaDocs) gastoFincaMap[d.id] = newId();

  // 4. Preparar documentos con IDs nuevos y referencias remapeadas
  const toWrite: { collection: string; id: string; data: Record<string, unknown> }[] = [];

  // ── users (perfil del demo) ────────────────────────────────────────────────
  const sourceUserDoc = await db.collection('users').doc(SOURCE_USER_ID).get();
  if (sourceUserDoc.exists) {
    toWrite.push({
      collection: 'users',
      id: demoUid,
      data: {
        ...sourceUserDoc.data(),
        userId: demoUid,
        nombre: DEMO_NOMBRE,
        email:  DEMO_EMAIL,
      },
    });
  } else {
    toWrite.push({
      collection: 'users',
      id: demoUid,
      data: { userId: demoUid, nombre: DEMO_NOMBRE, email: DEMO_EMAIL },
    });
  }

  // ── fincas ────────────────────────────────────────────────────────────────
  for (const d of fincaDocs) {
    toWrite.push({
      collection: 'fincas',
      id: fincaMap[d.id],
      data: { ...d.data(), userId: demoUid },
    });
  }

  // ── lotes ─────────────────────────────────────────────────────────────────
  for (const d of loteDocs) {
    const src = d.data() as Record<string, unknown>;
    toWrite.push({
      collection: 'lotes',
      id: loteMap[d.id],
      data: {
        ...src,
        userId:  demoUid,
        fincaId: fincaMap[src.fincaId as string] ?? src.fincaId,
      },
    });
  }

  // ── animales ──────────────────────────────────────────────────────────────
  for (const d of animalDocs) {
    const src = d.data() as Record<string, unknown>;
    toWrite.push({
      collection: 'animales',
      id: animalMap[d.id],
      data: {
        ...src,
        userId:  demoUid,
        fincaId: fincaMap[src.fincaId as string] ?? src.fincaId,
        loteId:  loteMap[src.loteId as string]   ?? src.loteId,
      },
    });
  }

  // ── pesos ─────────────────────────────────────────────────────────────────
  for (const d of pesoDocs) {
    const src = d.data() as Record<string, unknown>;
    toWrite.push({
      collection: 'pesos',
      id: newId(),
      data: {
        ...src,
        userId:   demoUid,
        fincaId:  fincaMap[src.fincaId as string]   ?? src.fincaId,
        loteId:   loteMap[src.loteId as string]     ?? src.loteId,
        animalId: animalMap[src.animalId as string] ?? src.animalId,
      },
    });
  }

  // ── gastos (por lote) ─────────────────────────────────────────────────────
  for (const d of gastoDocs) {
    const src = d.data() as Record<string, unknown>;
    toWrite.push({
      collection: 'gastos',
      id: newId(),
      data: {
        ...src,
        userId:   demoUid,
        fincaId:  fincaMap[src.fincaId as string] ?? src.fincaId,
        loteId:   loteMap[src.loteId as string]   ?? src.loteId,
        // animalId es opcional en gastos
        ...(src.animalId
          ? { animalId: animalMap[src.animalId as string] ?? src.animalId }
          : {}),
      },
    });
  }

  // ── gastos de finca ───────────────────────────────────────────────────────
  for (const d of gastoFincaDocs) {
    const src = d.data() as Record<string, unknown>;
    // lotesAplicados: Array<{ loteId, monto, ... }>
    const lotesAplicados = (src.lotesAplicados as Record<string, unknown>[] ?? []).map(la => ({
      ...la,
      loteId: loteMap[la.loteId as string] ?? la.loteId,
    }));
    toWrite.push({
      collection: 'gastosFinca',
      id: gastoFincaMap[d.id],
      data: {
        ...src,
        userId:  demoUid,
        fincaId: fincaMap[src.fincaId as string] ?? src.fincaId,
        lotesAplicados,
      },
    });
  }

  // ── ventas ────────────────────────────────────────────────────────────────
  for (const d of ventaDocs) {
    const src = d.data() as Record<string, unknown>;
    // items: Array<{ animalId, ... }>
    const items = (src.items as Record<string, unknown>[] ?? []).map(item => ({
      ...item,
      animalId: animalMap[item.animalId as string] ?? item.animalId,
    }));
    toWrite.push({
      collection: 'ventas',
      id: newId(),
      data: {
        ...src,
        userId:  demoUid,
        fincaId: fincaMap[src.fincaId as string] ?? src.fincaId,
        loteId:  loteMap[src.loteId as string]   ?? src.loteId,
        items,
      },
    });
  }

  // ── eventos sanitarios ────────────────────────────────────────────────────
  for (const d of eventoDocs) {
    const src = d.data() as Record<string, unknown>;
    toWrite.push({
      collection: 'eventosSanitarios',
      id: newId(),
      data: {
        ...src,
        userId:   demoUid,
        fincaId:  fincaMap[src.fincaId as string]   ?? src.fincaId,
        loteId:   loteMap[src.loteId as string]     ?? src.loteId,
        animalId: animalMap[src.animalId as string] ?? src.animalId,
      },
    });
  }

  // 5. Escribir todo en batches
  console.log(`\n✍️   Escribiendo ${toWrite.length} documentos en Firestore...`);
  await writeBatches(toWrite);

  // 6. Resumen final
  console.log('\n✅  Copia completada exitosamente');
  console.log('─────────────────────────────────────────');
  console.log('  Credenciales del usuario demo:');
  console.log(`  📧  Email:      ${DEMO_EMAIL}`);
  console.log(`  🔑  Contraseña: ${DEMO_PASSWORD}`);
  console.log(`  🆔  UID:        ${demoUid}`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌  Error en copy-to-demo:', err);
  process.exit(1);
});
