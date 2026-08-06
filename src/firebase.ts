import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
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

// Browsers embutidos (WhatsApp/Facebook/Instagram) — o Google bloqueia OAuth
// nestes; a única solução é o utilizador abrir no browser verdadeiro.
export function dentroDeAppBrowser(): boolean {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua);
}

// Login Google resiliente: popup no desktop; se o popup for bloqueado
// (telemóveis), cai para redirect — o onAuthStateChanged apanha no regresso.
// Cancelamentos não lançam; erros reais lançam com e.code para a UI traduzir.
export async function entrarComGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e: any) {
    const code = String(e?.code || "");
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled") return;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw e;
  }
}

export function mensagemErroAuth(e: any): string {
  const code = String(e?.code || "");
  if (code === "auth/unauthorized-domain") return "Este endereço ainda não está autorizado para login. Tente em https://intime.co.mz ou contacte-nos pelo WhatsApp.";
  if (code === "auth/network-request-failed") return "Sem ligação. Verifique a internet e tente de novo.";
  return "Não foi possível entrar com Google. Tente de novo ou abra o site no Chrome.";
}

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
