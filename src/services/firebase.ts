import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

// Persistencia offline con API moderna (Firestore v9.6+)
// - persistentLocalCache: guarda todos los datos en IndexedDB del dispositivo
// - persistentMultipleTabManager: soporta múltiples pestañas sin conflictos
// Las escrituras hechas sin conexión se guardan en disco y se sincronizan
// automáticamente cuando vuelve internet, aunque se haya cerrado el browser.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;