import { Link } from "react-router-dom";
import { useSiteConfig } from "../useSiteConfig";

export default function Footer() {
  const cfg = useSiteConfig();
  return (
    <footer className="border-t border-line py-24 bg-bg relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
      
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-3 font-display font-bold text-2xl text-fg tracking-tight mb-6">
              <img src="/logo-intime.png" alt="Intime" className="logo-img w-9 h-9" />
              <span>INTIME</span>
            </Link>
            <p className="text-faint text-[11px] uppercase tracking-[0.2em] leading-relaxed font-mono">
              INTERNET STARLINK INSTALADA E GERIDA.<br/>
              OPERAÇÃO MOÇAMBIQUE.<br/>
              STATUS: <span className="text-accent">ONLINE.</span>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-12 md:gap-20">
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg/40 mb-2">Serviço</h4>
              <Link to="/como-funciona" className="text-xs font-mono uppercase tracking-widest text-muted hover:text-fg transition-colors">Como funciona</Link>
              <Link to="/sobre" className="text-xs font-mono uppercase tracking-widest text-muted hover:text-fg transition-colors">Sobre</Link>
              <a href="/#planos" className="text-xs font-mono uppercase tracking-widest text-muted hover:text-fg transition-colors">Planos</a>
              <Link to="/contacto" className="text-xs font-mono uppercase tracking-widest text-muted hover:text-fg transition-colors">Contacto</Link>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg/40 mb-2">Comunicação</h4>
              <a href={`mailto:${cfg.contacts.email}`} className="text-xs font-mono uppercase tracking-widest text-muted hover:text-accent transition-colors">{cfg.contacts.email}</a>
              <a href={`https://wa.me/${cfg.contacts.whatsapp}`} className="text-xs font-mono uppercase tracking-widest text-muted hover:text-accent transition-colors">{cfg.contacts.phone}</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-8 border-t border-line text-[10px] uppercase font-mono tracking-widest text-faint">
          <span>© 2026 INTIME, LDA · MZ</span>
          <span className="max-w-2xl text-left md:text-right normal-case tracking-normal">
            A Intime presta serviços de instalação, gestão e suporte de internet. A disponibilidade depende da localização e de condições técnicas. As marcas mencionadas pertencem aos respetivos proprietários; a Intime não é representante oficial salvo indicação expressa.
          </span>
        </div>
      </div>
    </footer>
  );
}
