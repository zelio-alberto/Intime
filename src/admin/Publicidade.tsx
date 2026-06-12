import { useRef, useState, type ReactNode, type RefObject } from "react";
import html2canvas from "html2canvas";
import AdCreative, { type AdData, type AdTheme } from "./AdCreative";
import { useConfig } from "./ConfigContext";
import { input, label, pageTitle, pageSub } from "./ui";
import { Download, Loader2, Sun, Moon } from "lucide-react";

function Frame({ w, h, scale, children }: { w: number; h: number; scale: number; children: ReactNode }) {
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: "hidden", border: "1px solid var(--line)" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>{children}</div>
    </div>
  );
}

export default function Publicidade() {
  const { cfg } = useConfig();
  const entry = cfg.plans.find((p) => p.from) || cfg.plans[0];
  const [theme, setTheme] = useState<AdTheme>("dark");
  const [busy, setBusy] = useState("");
  const [data, setData] = useState<AdData>({
    price: (entry ? entry.price : cfg.hero.price) + " MT",
    unit: "/mês",
    whatsapp: cfg.contacts.phone,
    website: "intime-hlux.onrender.com",
    headline: "Obtenha internet Starlink agora.",
  });
  const set = (k: keyof AdData, v: string) => setData((d) => ({ ...d, [k]: v }));

  const [opts, setOpts] = useState({ waButton: true, showNumber: true, showWeb: true });
  const toggle = (k: keyof typeof opts) => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const [copied, setCopied] = useState("");
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1800); };

  // Links clicáveis para colar na legenda / estado / bio
  let waDigits = data.whatsapp.replace(/\D/g, "");
  if (waDigits && !waDigits.startsWith("258") && waDigits.length <= 9) waDigits = "258" + waDigits;
  const waLink = `https://wa.me/${waDigits}?text=${encodeURIComponent("Olá Intime! Quero saber mais sobre a internet Starlink.")}`;
  const siteLink = /^https?:\/\//.test(data.website) ? data.website : "https://" + data.website;

  const sq = useRef<HTMLDivElement>(null);
  const st = useRef<HTMLDivElement>(null);
  const ls = useRef<HTMLDivElement>(null);

  const dl = async (ref: RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    setBusy(name);
    try {
      const canvas = await html2canvas(ref.current, { scale: 1, backgroundColor: null, useCORS: true, logging: false });
      const a = document.createElement("a");
      a.download = `${name}-${theme}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) { alert("Falha ao gerar a imagem. Tente novamente."); }
    setBusy("");
  };

  const cards: { id: string; ref: RefObject<HTMLDivElement | null>; title: string; dim: string; w: number; h: number; scale: number; format: "sq" | "st" | "ls" }[] = [
    { id: "quadrado", ref: sq, title: "Quadrado", dim: "1080×1080 · Instagram / WhatsApp", w: 1080, h: 1080, scale: 0.33, format: "sq" },
    { id: "story", ref: st, title: "Story / Status", dim: "1080×1920 · WhatsApp / Stories", w: 1080, h: 1920, scale: 0.22, format: "st" },
    { id: "horizontal", ref: ls, title: "Horizontal", dim: "1200×628 · Facebook / link", w: 1200, h: 628, scale: 0.33, format: "ls" },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Publicidade</h1>
      <p className={pageSub}>Crie imagens para redes sociais. Ajuste os textos, escolha o estilo e descarregue em PNG.</p>

      {/* Controlos */}
      <div className="border border-line bg-card p-5 md:p-6 mb-8">
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <span className={label}>Estilo</span>
            <div className="flex">
              <button onClick={() => setTheme("dark")} className={`flex items-center gap-2 px-4 py-2.5 text-sm border ${theme === "dark" ? "bg-fg text-bg border-fg" : "border-line text-muted"}`}><Moon size={15} /> Escuro</button>
              <button onClick={() => setTheme("light")} className={`flex items-center gap-2 px-4 py-2.5 text-sm border ${theme === "light" ? "bg-fg text-bg border-fg" : "border-line text-muted"}`}><Sun size={15} /> Claro</button>
            </div>
          </div>
          <div><label className={label}>Título</label><input className={input + " min-w-[260px]"} value={data.headline} onChange={(e) => set("headline", e.target.value)} /></div>
          <div><label className={label}>Preço</label><input className={input + " w-[120px]"} value={data.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><label className={label}>Por</label><input className={input + " w-[90px]"} value={data.unit} onChange={(e) => set("unit", e.target.value)} /></div>
          <div><label className={label}>WhatsApp</label><input className={input + " w-[180px]"} value={data.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          <div><label className={label}>Website (link)</label><input className={input + " w-[230px]"} value={data.website} onChange={(e) => set("website", e.target.value)} /></div>
        </div>

        {/* O que mostrar na imagem */}
        <div className="flex flex-wrap items-center gap-5 mt-5 pt-5 border-t border-line">
          <span className={label + " mb-0"}>Mostrar na imagem:</span>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer"><input type="checkbox" checked={opts.waButton} onChange={() => toggle("waButton")} /> Botão WhatsApp</label>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer"><input type="checkbox" checked={opts.showNumber} onChange={() => toggle("showNumber")} disabled={!opts.waButton} /> Número de telefone</label>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer"><input type="checkbox" checked={opts.showWeb} onChange={() => toggle("showWeb")} /> Link do site</label>
          <button onClick={() => setOpts({ waButton: true, showNumber: false, showWeb: false })} className="text-xs font-mono uppercase tracking-widest border border-line px-3 py-1.5 hover:bg-fg hover:text-bg transition-colors">Versão limpa</button>
        </div>
      </div>

      {/* Links clicáveis para a legenda/estado */}
      <div className="border border-line bg-card p-5 md:p-6 mb-8">
        <h2 className="font-display text-lg mb-1">Links para a legenda / estado</h2>
        <p className="text-muted text-sm mb-4">A imagem fica limpa; cole estes links no texto da publicação/estado/bio — ao clicar, leva o cliente direto.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className={label}>Link WhatsApp (clicável)</span>
            <div className="flex gap-2">
              <input readOnly className={input + " text-[12px]"} value={waLink} onFocus={(e) => e.target.select()} />
              <button onClick={() => copy(waLink, "wa")} className="bg-fg text-bg px-4 font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-accent transition-colors whitespace-nowrap">{copied === "wa" ? "Copiado ✓" : "Copiar"}</button>
            </div>
          </div>
          <div>
            <span className={label}>Link do site</span>
            <div className="flex gap-2">
              <input readOnly className={input + " text-[12px]"} value={siteLink} onFocus={(e) => e.target.select()} />
              <button onClick={() => copy(siteLink, "web")} className="bg-fg text-bg px-4 font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-accent transition-colors whitespace-nowrap">{copied === "web" ? "Copiado ✓" : "Copiar"}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Criativos */}
      <div className="flex flex-wrap gap-8">
        {cards.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div><div className="font-display text-lg text-fg">{c.title}</div><div className="text-[11px] font-mono text-faint">{c.dim}</div></div>
              <button onClick={() => dl(c.ref, "intime-" + c.id)} disabled={!!busy}
                className="flex items-center gap-2 bg-fg text-bg px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
                {busy === "intime-" + c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PNG
              </button>
            </div>
            <Frame w={c.w} h={c.h} scale={c.scale}>
              <AdCreative ref={c.ref} format={c.format} theme={theme} data={data} opts={opts} />
            </Frame>
          </div>
        ))}
      </div>
    </div>
  );
}
