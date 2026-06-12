import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { clsx } from "clsx";
import { getTheme, toggleTheme, type Theme } from "../theme";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");
  const location = useLocation();

  useEffect(() => {
    setThemeState(getTheme());
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMobileOpen(false);
  const onToggleTheme = () => setThemeState(toggleTheme());

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-[200] transition-all duration-500 backdrop-blur-xl border-b",
          scrolled
            ? "bg-bg/80 border-line py-4 shadow-2xl"
            : "bg-transparent border-transparent py-6"
        )}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-2xl text-fg tracking-tight">
            <img src="/logo-intime.png" alt="Intime" className="logo-img w-9 h-9" />
            <span>INTIME</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            <Link to="/" className={clsx("text-[11px] font-mono tracking-[0.2em] uppercase transition-colors", location.pathname === "/" ? "text-accent" : "text-muted hover:text-fg")}>Início</Link>
            <Link to="/como-funciona" className={clsx("text-[11px] font-mono tracking-[0.2em] uppercase transition-colors", location.pathname === "/como-funciona" ? "text-accent" : "text-muted hover:text-fg")}>Como funciona</Link>
            <Link to="/sobre" className={clsx("text-[11px] font-mono tracking-[0.2em] uppercase transition-colors", location.pathname === "/sobre" ? "text-accent" : "text-muted hover:text-fg")}>Sobre</Link>
            <a href="/#planos" className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted hover:text-fg transition-colors">Planos</a>
            <Link to="/contacto" className={clsx("text-[11px] font-mono tracking-[0.2em] uppercase transition-colors", location.pathname === "/contacto" ? "text-accent" : "text-muted hover:text-fg")}>Contacto</Link>
          </nav>

          <div className="flex items-center gap-5">
            <button
              onClick={onToggleTheme}
              aria-label="Alternar tema"
              className="grid place-items-center w-10 h-10 border border-line text-fg hover:bg-accent hover:text-bg transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/aderir" className="hidden lg:inline-flex items-center justify-center px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] bg-fg text-bg hover:bg-accent transition-colors font-bold">
              Pedir instalação
            </Link>
            <button className="lg:hidden p-2 text-fg" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[199] bg-bg pt-28 px-6 pb-10 flex flex-col gap-4 overflow-y-auto lg:hidden">
          <Link to="/" onClick={closeMenu} className="py-4 text-xl font-display uppercase tracking-widest border-b border-line text-fg">Início</Link>
          <Link to="/como-funciona" onClick={closeMenu} className="py-4 text-xl font-display uppercase tracking-widest border-b border-line text-fg">Como funciona</Link>
          <Link to="/sobre" onClick={closeMenu} className="py-4 text-xl font-display uppercase tracking-widest border-b border-line text-fg">Sobre</Link>
          <a href="/#planos" onClick={closeMenu} className="py-4 text-xl font-display uppercase tracking-widest border-b border-line text-fg">Planos</a>
          <Link to="/contacto" onClick={closeMenu} className="py-4 text-xl font-display uppercase tracking-widest border-b border-line text-fg">Contacto</Link>
          <Link to="/aderir" onClick={closeMenu} className="mt-8 flex items-center justify-center px-8 py-5 bg-fg text-bg font-mono text-xs tracking-widest font-bold uppercase transition-colors">
            Pedir instalação
          </Link>
        </div>
      )}
    </>
  );
}
