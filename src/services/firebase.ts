import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore';

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
// Reemplazá estos valores con los de tu proyecto en Firebase Console
// https://console.firebase.google.com/ → Tu proyecto → Configuración → Aplicaciones web
const firebaseConfig = {
  apiKey: "AIzaSyBCVuMA6iDPRZ7RmaegC_hG1txMETKO7a0",
  authDomain: "ganacr.firebaseapp.com",
  projectId: "ganacr",
  storageBucket: "ganacr.firebasestorage.app",
  messagingSenderId: "640833263608",
  appId: "1:640833263608:web:5e9470a046b2bb22a7280d",
};
// ────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistencia offline — funciona aunque no haya internet
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('GanaCR: Persistencia offline no disponible (múltiples pestañas abiertas)');
  } else if (err.code === 'unimplemented') {
    console.warn('GanaCR: Este navegador no soporta persistencia offline');
  }
});

export default app;