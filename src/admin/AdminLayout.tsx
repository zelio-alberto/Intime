import { Fragment, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { ConfigProvider, useConfig } from "./ConfigContext";
import { LayoutDashboard, Inbox, Settings, LogOut, Loader2, ExternalLink, ArrowDownLeft, Satellite, Users, Receipt, History, FileText, Map, UserPlus, TrendingUp, ChevronDown, BookOpen, Lightbulb } from "lucide-react";

type Item = { to: string; end?: boolean; label: string; icon: typeof Users };
type Group = { label: string; icon: typeof Users; items: Item[] };

const PAINEL: Item = { to: "/admin", end: true, label: "Painel", icon: LayoutDashboard };

const GROUPS: Group[] = [
  {
    label: "Clientes", icon: Users, items: [
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/novo", label: "Novo cadastro", icon: UserPlus },
      { to: "/admin/contratos", label: "Contratos", icon: FileText },
      { to: "/admin/mapa", label: "Mapa", icon: Map },
    ],
  },
  {
    label: "Starlink", icon: Satellite, items: [
      { to: "/admin/starlinks", label: "Kits / Starlinks", icon: Satellite },
      { to: "/admin/starlink", label: "Mensalidades Starlink", icon: Receipt },
    ],
  },
  {
    label: "Finanças", icon: TrendingUp, items: [
      { to: "/admin/financas", label: "Resumo financeiro", icon: TrendingUp },
      { to: "/admin/masterfile", label: "Masterfile", icon: BookOpen },
      { to: "/admin/estrategias", label: "Estratégias", icon: Lightbulb },
      { to: "/admin/transacoes", label: "Transações", icon: ArrowDownLeft },
      { to: "/admin/historico", label: "Histórico", icon: History },
    ],
  },
];

const SOLICITACOES: Item = { to: "/admin/solicitacoes", label: "Solicitações", icon: Inbox };
const CONFIG: Item = { to: "/admin/config", label: "Configurações", icon: Settings };

function tabClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`;
}

type NavDropdownProps = { group: Group; open: boolean; onToggle: () => void; onClose: () => void };

function NavDropdown({ group, open, onToggle, onClose }: NavDropdownProps) {
  const { pathname } = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [topFix, setTopFix] = useState(0);
  const active = group.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  // Em mobile a nav é um scroll horizontal (overflow-x-auto), que cortaria um
  // dropdown absolute — por isso aí o menu abre "fixed", por baixo da barra.
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  useEffect(() => {
    if (open && btnRef.current) setTopFix(btnRef.current.getBoundingClientRect().bottom);
  }, [open]);
  return (
    <div className="md:relative">
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${active || open ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
      >
        <group.icon size={16} /> {group.label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="fixed left-3 right-3 md:absolute md:left-0 md:right-auto md:top-full mt-px md:min-w-[230px] bg-bg border border-line shadow-2xl z-[60] py-1"
          style={isMobile ? { top: topFix } : undefined}
        >
          {group.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? "text-accent bg-card" : "text-muted hover:text-fg hover:bg-card"}`
              }
            >
              <it.icon size={15} /> {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashBanner() {
  const { flash } = useConfig();
  if (!flash) return null;
  return <div className="fixed top-0 left-0 right-0 z-[70] bg-accent text-bg text-center text-sm py-2 font-medium">{flash}</div>;
}

export default function AdminLayout() {
  const nav = useNavigate();
  const { user, authorized, loading } = useAdminAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => { if (!loading && (!user || authorized === false)) nav("/admin/login"); }, [user, authorized, loading, nav]);

  // fechar dropdown ao clicar fora ou mudar de rota
  useEffect(() => { setOpenMenu(null); }, [pathname]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
            <nav ref={navRef} className="flex gap-1 -mb-px overflow-x-auto md:overflow-visible">
              <NavLink to={PAINEL.to} end={PAINEL.end} className={tabClass}>
                <PAINEL.icon size={16} /> {PAINEL.label}
              </NavLink>
              {GROUPS.map((g) => (
                <Fragment key={g.label}>
                  <NavDropdown
                    group={g}
                    open={openMenu === g.label}
                    onToggle={() => setOpenMenu((cur) => (cur === g.label ? null : g.label))}
                    onClose={() => setOpenMenu(null)}
                  />
                </Fragment>
              ))}
              <NavLink to={SOLICITACOES.to} className={tabClass}>
                <SOLICITACOES.icon size={16} /> {SOLICITACOES.label}
              </NavLink>
              <div className="flex-1" />
              <NavLink to={CONFIG.to} className={tabClass}>
                <CONFIG.icon size={16} /> {CONFIG.label}
              </NavLink>
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
