import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { LogIn, ShieldAlert } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const { user, authorized, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && user && authorized) nav("/admin");
  }, [user, authorized, loading, nav]);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      alert("Não foi possível iniciar sessão. Tente novamente.");
    }
  };

  const notAuthorized = !loading && user && authorized === false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-fg px-6">
      <div className="w-full max-w-md border border-line bg-card p-10">
        <Link to="/" className="flex items-center gap-3 font-display font-bold text-2xl mb-8">
          <img src="/logo-intime.png" alt="Intime" className="logo-img w-9 h-9" />
          <span>INTIME</span>
        </Link>

        <h1 className="font-display text-3xl mb-2">Gestão</h1>
        <p className="text-muted text-sm mb-8">Acesso restrito à equipa Intime.</p>

        {notAuthorized ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 border border-line p-4 text-sm">
              <ShieldAlert size={20} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Sem permissão</p>
                <p className="text-muted">A conta <b>{user?.email}</b> não está autorizada. Peça a um administrador para a adicionar.</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="w-full py-4 border border-line font-mono text-xs uppercase tracking-[0.2em] hover:bg-fg hover:text-bg transition-colors">
              Sair e tentar outra conta
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50"
          >
            <LogIn size={16} /> Entrar com Google
          </button>
        )}

        <Link to="/" className="block text-center text-xs text-faint mt-8 hover:text-fg transition-colors">← Voltar ao site</Link>
      </div>
    </div>
  );
}
