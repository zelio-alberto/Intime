import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { ConfigProvider, useConfig } from "./ConfigContext";
import { LayoutDashboard, Inbox, Settings, Megaphone, LogOut, Loader2, ExternalLink } from "lucide-react";

const NAV = [
  { to: "/admin", end: true, label: "Painel", icon: LayoutDashboard },
  { to: "/admin/solicitacoes", label: "Solicitações", icon: Inbox },
  { to: "/admin/config", label: "Configurações", icon: Settings },
  { to: "/admin/publicidade", label: "Publicidade", icon: Megaphone },
];

function tabClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`;
}

function FlashBanner() {
  const { flash } = useConfig();
  if (!flash) return null;
  return <div className="fixed top-0 left-0 right-0 z-[70] bg-accent text-bg text-center text-sm py-2 font-medium">{flash}</div>;
}

export default function AdminLayout() {
  const nav = useNavigate();
  const { user, authorized, loading } = useAdminAuth();

  useEffect(() => { if (!loading && (!user || authorized === false)) nav("/admin/login"); }, [user, authorized, loading, nav]);

  if (loading || !authorized) return <div className="min-h-screen grid place-items-center bg-bg text-muted"><Loader2 className="animate-spin" /></div>;

  return (
    <ConfigProvider>
      <FlashBanner />
      <div className="min-h-screen bg-bg text-fg">
        <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-line">
          <div className="px-6 md:px-10">
            <div className="flex items-center justify-between h-16 gap-4">
              <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl">
                <img src="/logo-intime.png" alt="Intime" className="logo-img w-8 h-8" /> Gestão
              </Link>
              <div className="flex items-center gap-5">
                <a href="/" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-2 text-xs text-muted hover:text-fg transition-colors"><ExternalLink size={14} /> Ver o site</a>
                <span className="hidden md:block text-xs text-faint truncate max-w-[220px]">{user?.email}</span>
                <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"><LogOut size={16} /> <span className="hidden sm:inline">Sair</span></button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto -mb-px">
              {NAV.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={tabClass}>
                  <it.icon size={16} /> {it.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="px-6 md:px-10 py-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </ConfigProvider>
  );
}
