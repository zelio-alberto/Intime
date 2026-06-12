import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { ConfigProvider, useConfig } from "./ConfigContext";
import { LayoutDashboard, Inbox, Mail, Boxes, Phone, FileText, Users, LogOut, Loader2, ExternalLink } from "lucide-react";

const NAV = [
  { group: "Geral", items: [
    { to: "/admin", end: true, label: "Painel", icon: LayoutDashboard },
    { to: "/admin/pedidos", label: "Pedidos", icon: Inbox },
    { to: "/admin/mensagens", label: "Mensagens", icon: Mail },
  ]},
  { group: "Configuração", items: [
    { to: "/admin/planos", label: "Pacotes", icon: Boxes },
    { to: "/admin/contactos", label: "Contactos & Hero", icon: Phone },
    { to: "/admin/contrato", label: "Contrato", icon: FileText },
  ]},
  { group: "Equipa", items: [
    { to: "/admin/membros", label: "Membros", icon: Users },
  ]},
];

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${isActive ? "bg-accent/10 text-accent border-l-2 border-accent" : "text-muted hover:text-fg hover:bg-card border-l-2 border-transparent"}`;
}

function FlashBanner() {
  const { flash } = useConfig();
  if (!flash) return null;
  return <div className="fixed top-0 left-0 right-0 z-[60] bg-accent text-bg text-center text-sm py-2 font-medium">{flash}</div>;
}

export default function AdminLayout() {
  const nav = useNavigate();
  const { user, authorized, loading } = useAdminAuth();

  useEffect(() => { if (!loading && (!user || authorized === false)) nav("/admin/login"); }, [user, authorized, loading, nav]);

  if (loading || !authorized) return <div className="min-h-screen grid place-items-center bg-bg text-muted"><Loader2 className="animate-spin" /></div>;

  return (
    <ConfigProvider>
      <FlashBanner />
      <div className="min-h-screen bg-bg text-fg flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col w-[250px] shrink-0 border-r border-line sticky top-0 h-screen">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl px-6 h-16 border-b border-line">
            <img src="/logo-intime.png" alt="Intime" className="logo-img w-8 h-8" /> Gestão
          </Link>
          <nav className="flex-1 overflow-y-auto py-4">
            {NAV.map((g) => (
              <div key={g.group} className="mb-4">
                <div className="px-6 mb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-faint">{g.group}</div>
                {g.items.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end} className={navClass}>
                    <it.icon size={17} /> {it.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="border-t border-line p-4">
            <a href="/" target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-muted hover:text-fg transition-colors mb-3"><ExternalLink size={14} /> Ver o site</a>
            <div className="text-[11px] text-faint truncate mb-3">{user?.email}</div>
            <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"><LogOut size={14} /> Sair</button>
          </div>
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Topbar (mobile) */}
          <div className="lg:hidden sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-line">
            <div className="flex items-center justify-between px-5 h-14">
              <Link to="/" className="flex items-center gap-2 font-display font-bold"><img src="/logo-intime.png" alt="" className="logo-img w-7 h-7" /> Gestão</Link>
              <button onClick={() => signOut(auth)} className="text-faint"><LogOut size={18} /></button>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
              {NAV.flatMap((g) => g.items).map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap border-b-2 ${isActive ? "border-accent text-fg" : "border-transparent text-faint"}`}>
                  <it.icon size={14} /> {it.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="px-6 md:px-10 py-8 md:py-10 max-w-[1100px]">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
