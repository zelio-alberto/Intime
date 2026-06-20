import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Reutiliza o mesmo projeto Firebase do INTIME ASSIST (zuma-1fec6),
// para o login de admin e os membros (authorizedUsers) já existirem.
const firebaseConfig = {
  apiKey: "AIzaSyAVE3twHQmxqgJq--l-Rgfd1UwdrxdE0UM",
  authDomain: "zuma-1fec6.firebaseapp.com",
  projectId: "zuma-1fec6",
  storageBucket: "zuma-1fec6.firebasestorage.app",
  messagingSenderId: "318242121214",
  appId: "1:318242121214:web:1751a64fd1697bde15ccaf",
  measurementId: "G-YN8HGF37SP",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);

export const storage = getStorage(app);

// Google Analytics (GA4). Só inicializa no browser (isSupported evita erros
// em ambientes sem window, ex.: build/SSR). Disponível em `analytics`.
export let analytics: Analytics | null = null;
isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(app);
  })
  .catch(() => {});

// Admin principal (não pode ser removido na gestão de membros)
export const MASTER_ADMIN = "zelio.a.chirindza@gmail.com";
