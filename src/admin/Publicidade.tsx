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
              <AdCreative ref={c.ref} format={c.format} theme={theme} data={data} />
            </Frame>
          </div>
        ))}
      </div>
    </div>
  );
}
