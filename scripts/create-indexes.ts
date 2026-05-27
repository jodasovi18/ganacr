/**
 * Creates all required Firestore composite indexes for the GanaCR app.
 * Uses the Firestore Management REST API with the service account credentials.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const serviceAccountPath = resolve(process.cwd(), 'scripts/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
const PROJECT_ID = serviceAccount.project_id;
const DATABASE = '(default)';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/collectionGroups`;

interface IndexField {
  fieldPath: string;
  order: 'ASCENDING' | 'DESCENDING';
}

interface IndexDef {
  collection: string;
  fields: IndexField[];
}

const INDEXES: IndexDef[] = [
  // useLotes: where('userId') + orderBy('createdAt', 'desc')
  {
    collection: 'lotes',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  // useAnimales: where('userId') + where('loteId') + orderBy('createdAt', 'desc')
  {
    collection: 'animales',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'loteId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  // useGastos: where('userId') + where('loteId') + orderBy('fecha', 'desc')
  {
    collection: 'gastos',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'loteId', order: 'ASCENDING' },
      { fieldPath: 'fecha', order: 'DESCENDING' },
    ],
  },
  // useVentas: where('userId') + where('loteId') + orderBy('fecha', 'desc')
  {
    collection: 'ventas',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'loteId', order: 'ASCENDING' },
      { fieldPath: 'fecha', order: 'DESCENDING' },
    ],
  },
  // usePesos: where('animalId') + orderBy('fecha', 'desc')
  {
    collection: 'pesos',
    fields: [
      { fieldPath: 'animalId', order: 'ASCENDING' },
      { fieldPath: 'fecha', order: 'DESCENDING' },
    ],
  },
];

async function main() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;

  if (!token) {
    console.error('ERROR: No se pudo obtener token de acceso.');
    process.exit(1);
  }

  console.log(`Creando índices en proyecto: ${PROJECT_ID}\n`);

  for (const idx of INDEXES) {
    const url = `${BASE_URL}/${idx.collection}/indexes`;
    const body = JSON.stringify({
      queryScope: 'COLLECTION',
      fields: idx.fields,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      const data = await res.json() as Record<string, unknown>;

      if (res.ok) {
        console.log(`✅ ${idx.collection}: índice enviado a crear → ${data.name}`);
      } else if (
        res.status === 409 ||
        (data.error as Record<string, unknown>)?.code === 409
      ) {
        console.log(`⏭️  ${idx.collection}: el índice ya existe (OK)`);
      } else {
        console.error(`❌ ${idx.collection}: error ${res.status}:`, JSON.stringify(data.error ?? data, null, 2));
      }
    } catch (err) {
      console.error(`❌ ${idx.collection}: error de red:`, err);
    }
  }

  console.log('\nListo. Los índices en estado "Compilando" estarán disponibles en 2–10 minutos.');
}

main().catch(err => {
  console.error('ERROR fatal:', err);
  process.exit(1);
});
