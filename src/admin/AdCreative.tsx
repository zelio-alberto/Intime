import { forwardRef } from "react";
import "./ads.css";

export type AdData = { price: string; unit: string; whatsapp: string; website: string; headline: string };
export type AdFormat = "sq" | "st" | "ls";
export type AdTheme = "dark" | "light";

const WA = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15l-1.4 5 5.1-1.3A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a13 13 0 01-5.7-5c-.4-.7-.9-1.6-.9-2.4 0-.8.4-1.2.6-1.4.2-.2.4-.2.6-.2h.4c.2 0 .4 0 .6.4l.7 1.8c.1.2 0 .4-.1.5l-.3.4c-.1.2-.3.3-.1.6.5.9 1 1.4 1.8 1.9.2.1.4.1.5 0l.6-.7c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.3.3.1.2.1.6-.1 1.3z" /></svg>
);
const GLOBE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>
);

type Opts = { waButton: boolean; showNumber: boolean; showWeb: boolean };

const AdCreative = forwardRef<HTMLDivElement, { format: AdFormat; theme: AdTheme; data: AdData; opts: Opts }>(
  ({ format, theme, data, opts }, ref) => {
    const logo = theme === "light" ? "/logo-intime.png" : "/logo-intime-white.png";
    const muted = theme === "light" ? "#6b7280" : "#9fb0c4";
    return (
      <div ref={ref} className={`ad ad-${format} ${theme === "light" ? "light" : ""}`}>
        <div className="stars" />
        <div className="glow" />
        <div className="dishbg" />
        <div className="brand"><img src={logo} alt="" crossOrigin="anonymous" />INTIME</div>
        {format !== "ls" && <div className="eyebrow">Internet Starlink · Moçambique</div>}
        <h2>{data.headline}</h2>
        <img className="dish" src="/produtos/standard.png" alt="" crossOrigin="anonymous" />
        <div className="price">
          <div className="from">A partir de</div>
          <div className="v"><b>{data.price}</b> <span style={{ fontSize: ".45em", color: muted }}>{data.unit}</span></div>
        </div>
        {opts.waButton && <div className="cta">{WA} {opts.showNumber ? <>WhatsApp · {data.whatsapp}</> : <>Fale connosco no WhatsApp</>}</div>}
        {format === "sq" && <div className="slogan">Onde há Intime,<br />há conexão.</div>}
        {format === "st" && <div className="slogan">Onde há Intime, há conexão.</div>}
        {opts.showWeb && <div className="web">{GLOBE} {data.website}</div>}
      </div>
    );
  }
);

export default AdCreative;
