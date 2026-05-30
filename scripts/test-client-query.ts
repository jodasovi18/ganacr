/**
 * test-client-query.ts
 * Replica EXACTAMENTE lo que hace el browser: usa el Client SDK (no Admin),
 * se autentica como demo@ganacr.com, y corre las queries reales de los hooks.
 * Esto pasa por las security rules igual que el browser.
 *
 * Uso: npx tsx scripts/test-client-query.ts
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBCVuMA6iDPRZ7RmaegC_hG1txMETKO7a0',
  authDomain: 'ganacr.firebaseapp.com',
  projectId: 'ganacr',
  storageBucket: 'ganacr.firebasestorage.app',
  messagingSenderId: '640833263608',
  appId: '1:640833263608:web:5e9470a046b2bb22a7280d',
};

const DEMO_EMAIL = 'demo@ganacr.com';
const DEMO_PASSWORD = 'GanaCR2026!';

async function main() {
  console.log('\n🧪  Test Client SDK — replica el browser\n');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Autenticarse como demo (igual que el browser)
  console.log('🔐  Autenticando como', DEMO_EMAIL, '...');
  const cred = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
  const uid = cred.user.uid;
  console.log('   ✓ UID:', uid, '\n');

  // 2. Query fincas (la que SÍ funciona en el browser)
  try {
    const fincasSnap = await getDocs(
      query(collection(db, 'fincas'), where('userId', '==', uid))
    );
    console.log(`📂  fincas: ${fincasSnap.size} documentos`);
    fincasSnap.docs.forEach((d) => console.log(`     ${d.id} → ${d.data().nombre}`));
  } catch (e: any) {
    console.error('   ❌ fincas ERROR:', e.code, e.message);
  }

  // 3. Query lotes por finca (la que devuelve 0 en el browser)
  const fincaLaEsperanza = '2Gw3QFX8M9nYdxutI2qk';
  try {
    const lotesSnap = await getDocs(
      query(
        collection(db, 'lotes'),
        where('userId', '==', uid),
        where('fincaId', '==', fincaLaEsperanza)
      )
    );
    console.log(`\n📦  lotes (finca La Esperanza): ${lotesSnap.size} documentos`);
    lotesSnap.docs.forEach((d) =>
      console.log(`     ${d.id} → ${d.data().nombreLote} (fincaId: ${d.data().fincaId})`)
    );
  } catch (e: any) {
    console.error('\n   ❌ lotes ERROR:', e.code, e.message);
  }

  // 4. Query lotes SOLO por userId (sin filtro de finca)
  try {
    const lotesAllSnap = await getDocs(
      query(collection(db, 'lotes'), where('userId', '==', uid))
    );
    console.log(`\n📦  lotes (solo userId): ${lotesAllSnap.size} documentos`);
    lotesAllSnap.docs.forEach((d) =>
      console.log(`     ${d.id} → fincaId: "${d.data().fincaId}" userId: "${d.data().userId}"`)
    );
  } catch (e: any) {
    console.error('\n   ❌ lotes (solo userId) ERROR:', e.code, e.message);
  }

  console.log('\n─────────────────────────────────────────\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Error fatal:', err.code ?? '', err.message ?? err);
  process.exit(1);
});
