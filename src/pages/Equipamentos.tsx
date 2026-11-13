import { lazy, Suspense, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SketchfabEmbed from "../components/SketchfabEmbed";
import { useSiteConfig } from "../useSiteConfig";
import {
  Home as HomeIcon, Wifi, Zap, Smartphone, Check, MessageCircle,
  Backpack, Building2, Router, MapPin, Loader2,
} from "lucide-react";

// O visualizador 3D (three.js) só é carregado nesta página — não pesa o resto do site.
const Model3D = lazy(() => import("../components/Model3D"));

// Página "Equipamentos": compara a Starlink Mini vs Standard (V4) de forma
// simples (cobertura na prática), mostra a rede mesh como extensão, e encaminha
// para o WhatsApp. Os preços e os renders 3D entram quando o boss os fornecer.

const MINI = "#7ab8ff"; // azul (consistente com o admin) — a Mini
// a Standard usa o accent ciano da marca (var --accent)

type Spec = { icon: typeof Wifi; k: string; v: string };

const specsMini: Spec[] = [
  { icon: HomeIcon, k: "Cobertura", v: "~112 m²" },
  { icon: Wifi, k: "Wi-Fi", v: "Wi-Fi 5 · na antena" },
  { icon: Zap, k: "Velocidade", v: "100–150 Mbps" },
  { icon: Smartphone, k: "Dispositivos", v: "até 128" },
];
const specsStd: Spec[] = [
  { icon: HomeIcon, k: "Cobertura", v: "~297 m²" },
  { icon: Wifi, k: "Wi-Fi", v: "Wi-Fi 6 · router próprio" },
  { icon: Zap, k: "Velocidade", v: "300–400 Mbps" },
  { icon: Smartphone, k: "Dispositivos", v: "até 235" },
];

const escolhas = [
  { q: "Apartamento ou espaço pequeno", a: "Uma antena só, fácil de instalar e de mudar de sítio.", pick: "Mini" as const },
  { q: "Viagens, acampamento ou mudo de local", a: "Leve, cabe na mochila, liga em minutos.", pick: "Mini" as const },
  { q: "Casa grande, 2 andares ou muitas paredes", a: "Router dentro de casa + quase o triplo do alcance.", pick: "Standard" as const },
  { q: "Empresa, muitos utilizadores ao mesmo tempo", a: "Mais velocidade e até 235 dispositivos ligados.", pick: "Standard" as const },
];

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { delay, duration: 0.5 } };
}

export default function Equipamentos() {
  const cfg = useSiteConfig();
  const wa = `https://wa.me/${(cfg.contacts.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent("Olá Intime! Quero saber sobre os equipamentos Starlink (Mini / Standard).")}`;

  return (
    <Layout>
      {/* ===== HERO ===== */}
      <section className="pt-48 pb-20 border-b border-line bg-card relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-accent opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10 grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
          <div>
            <motion.span {...fadeUp(0)} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Equipamentos · Starlink</motion.span>
            <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-display font-medium text-fg tracking-tighter mb-8">
              A internet certa <br /> para o seu <span className="text-accent">espaço</span>.
            </motion.h1>
            <motion.p {...fadeUp(0.2)} className="text-xl text-muted font-light max-w-xl border-l border-line pl-6">
              Duas antenas, dois tipos de uso. Veja qual cobre a sua casa ou empresa — e, se for grande, nós levamos o sinal a todos os cantos.
            </motion.p>
            <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-3 mt-10">
              <span className="inline-flex items-center gap-2 border border-line bg-bg px-4 py-2 text-xs text-muted"><span className="w-2 h-2 rounded-full" style={{ background: MINI }} /> Mini · portátil</span>
              <span className="inline-flex items-center gap-2 border border-line bg-bg px-4 py-2 text-xs text-muted"><span className="w-2 h-2 rounded-full bg-accent" /> Standard V4 · fixo</span>
              <span className="inline-flex items-center gap-2 border border-line bg-bg px-4 py-2 text-xs text-muted"><Check size={13} className="text-accent" /> Instalação Intime</span>
            </motion.div>
          </div>
          <motion.div {...fadeUp(0.2)} className="relative hidden lg:block">
            <div className="absolute inset-0 bg-accent opacity-[0.06] blur-[80px] rounded-full" />
            <img src="/produtos/standard.png" alt="Starlink Standard" className="relative w-full max-w-md mx-auto drop-shadow-2xl" draggable={false} />
          </motion.div>
        </div>
      </section>

      {/* ===== COBERTURA ===== */}
      <section className="py-24 border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.span {...fadeUp(0)} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">O que isto quer dizer</motion.span>
          <motion.h2 {...fadeUp(0.05)} className="text-4xl md:text-5xl font-display font-medium text-fg tracking-tight mb-12">Até onde chega o sinal</motion.h2>

          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center">
            <motion.div {...fadeUp(0.1)} className="border border-line bg-card p-6 lg:p-10">
              <svg viewBox="0 0 440 340" role="img" aria-label="A Standard V4 cobre a casa toda; a Mini cobre a zona próxima da antena." className="w-full h-auto">
                <defs>
                  <radialGradient id="gStar" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                    <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.07" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="gMini" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={MINI} stopOpacity="0.32" />
                    <stop offset="75%" stopColor={MINI} stopOpacity="0.10" />
                    <stop offset="100%" stopColor={MINI} stopOpacity="0" />
                  </radialGradient>
                  <clipPath id="houseClip"><rect x="36" y="48" width="368" height="244" rx="14" /></clipPath>
                </defs>
                <g clipPath="url(#houseClip)">
                  <circle cx="150" cy="186" r="168" fill="url(#gStar)" />
                  <circle cx="150" cy="186" r="96" fill="url(#gMini)" />
                  <circle cx="150" cy="186" r="168" fill="none" stroke="var(--accent)" strokeWidth="1.3" strokeDasharray="5 6" opacity="0.7" />
                  <circle cx="150" cy="186" r="96" fill="none" stroke={MINI} strokeWidth="1.3" strokeDasharray="5 6" opacity="0.8" />
                </g>
                <rect x="36" y="48" width="368" height="244" rx="14" fill="none" stroke="var(--line)" strokeWidth="1.5" />
                <g stroke="var(--line)" strokeWidth="1.5" opacity="0.8">
                  <line x1="250" y1="48" x2="250" y2="170" /><line x1="250" y1="170" x2="404" y2="170" />
                  <line x1="150" y1="292" x2="150" y2="210" /><line x1="250" y1="230" x2="404" y2="230" />
                </g>
                <g fill="var(--muted)" fontSize="11" fontFamily="ui-monospace,monospace">
                  <text x="70" y="90">Sala</text><text x="300" y="90">Quarto 1</text>
                  <text x="300" y="206">Quarto 2</text><text x="300" y="266">Suite</text>
                </g>
                <g>
                  <circle cx="150" cy="186" r="15" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5" />
                  <path d="M143 188a10 10 0 0 1 14 0" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                  <path d="M146 184a5 5 0 0 1 8 0" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                  <circle cx="150" cy="190" r="1.6" fill="var(--accent)" />
                </g>
                <text x="150" y="216" textAnchor="middle" fill="var(--muted)" fontSize="10.5" fontFamily="ui-monospace,monospace">antena</text>
                <text x="246" y="150" fill={MINI} fontSize="12" fontWeight="700" fontFamily="ui-monospace,monospace">Mini</text>
                <text x="316" y="300" fill="var(--accent)" fontSize="12" fontWeight="700" fontFamily="ui-monospace,monospace">Standard V4</text>
              </svg>
            </motion.div>

            <motion.div {...fadeUp(0.2)}>
              <div className="flex gap-4 mb-7">
                <span className="w-3.5 h-3.5 mt-1 shrink-0" style={{ background: MINI }} />
                <div>
                  <p className="text-fg font-medium">Mini — até ~112 m²</p>
                  <p className="text-muted text-sm mt-1">Um T2/T3, escritório pequeno ou a zona à volta da antena. Ao ar livre chega a 15–20 m.</p>
                </div>
              </div>
              <div className="flex gap-4 mb-7">
                <span className="w-3.5 h-3.5 mt-1 shrink-0 bg-accent" />
                <div>
                  <p className="text-fg font-medium">Standard V4 — até ~297 m²</p>
                  <p className="text-muted text-sm mt-1">Moradia de 3–4 quartos, 2 andares ou armazém. O router fica dentro de casa e atravessa paredes com mais força.</p>
                </div>
              </div>
              <p className="text-xs text-muted/70 border-t border-dashed border-line pt-4 mt-6">
                Valores aproximados. Paredes de betão, lajes e espelhos reduzem o alcance real — por isso medimos no local antes de instalar.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CARTÕES ===== */}
      <section className="py-24 border-b border-line bg-card">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <div>
              <motion.span {...fadeUp(0)} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Escolha o seu modelo</motion.span>
              <motion.h2 {...fadeUp(0.05)} className="text-4xl md:text-5xl font-display font-medium text-fg tracking-tight">Mini ou Standard</motion.h2>
            </div>
            <p className="text-muted text-sm max-w-xs">Preços e renders 3D de cada equipamento entram aqui.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ProductCard
              variant="mini" tag="Portátil" tagIcon={Backpack}
              name="Starlink Mini"
              forWho="Para quem quer levar a internet para onde for — ou cobrir um espaço pequeno."
              specs={specsMini} cta="Quero a Mini" wa={wa}
              price="15.500 MT" priceNote="preço de referência · equipamento"
              media={
                <SketchfabEmbed
                  modelId="4aab458d639648e28443c38b11f6bcca"
                  title="Starlink Mini Antenna Assembly"
                  author="Salvado_3Dalí"
                  authorUrl="https://sketchfab.com/rhitemax"
                />
              }
            />
            <ProductCard
              variant="std" featured tag="Mais cobertura" tagIcon={Building2}
              name="Starlink Standard (V4)"
              forWho="Para casas grandes e empresas — router dentro de casa, sinal forte em todos os cantos."
              specs={specsStd} cta="Quero a Standard" wa={wa}
              price="25.900 MT" priceNote="preço de referência · equipamento"
              media={
                <Suspense fallback={
                  <div className="absolute inset-0 grid place-items-center text-muted/60">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                }>
                  <Model3D url="/models/starlink-standard.glb" />
                </Suspense>
              }
            />
          </div>
        </div>
      </section>

      {/* ===== QUAL É PARA SI ===== */}
      <section className="py-24 border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.span {...fadeUp(0)} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Em 10 segundos</motion.span>
          <motion.h2 {...fadeUp(0.05)} className="text-4xl md:text-5xl font-display font-medium text-fg tracking-tight mb-12">Qual é para si?</motion.h2>
          <div className="grid sm:grid-cols-2 gap-px bg-line border border-line">
            {escolhas.map((e, i) => (
              <motion.div key={e.q} {...fadeUp(0.05 * i)} className="bg-bg p-7 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-fg font-medium">{e.q}</p>
                  <p className="text-muted text-sm mt-1.5">{e.a}</p>
                </div>
                <span
                  className="font-mono text-[11px] uppercase tracking-widest px-2.5 py-1 shrink-0"
                  style={e.pick === "Mini"
                    ? { color: MINI, background: "rgba(122,184,255,0.12)" }
                    : { color: "var(--accent)", background: "rgba(0,229,255,0.12)" }}
                >{e.pick}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MESH ===== */}
      <section className="py-24 border-b border-line bg-card">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fadeUp(0)}>
            <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Tecnologia Mesh</span>
            <h2 className="text-3xl md:text-4xl font-display font-medium text-fg tracking-tight mb-6">Casa grande?<br />Sinal em todos os cantos.</h2>
            <p className="text-muted text-lg font-light max-w-md">
              Quando um só equipamento não chega à casa toda, acrescentamos <span className="text-fg">repetidores Wi-Fi (mesh)</span> — pequenos pontos que repassam o sinal de divisão em divisão, sem quebras e com um só nome de rede.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Uma só rede: anda pela casa sem trocar de Wi-Fi.",
                "Chega a quintais, 2.º andar, anexos e armazéns.",
                "A Intime mede, instala e configura por si.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-fg/90"><Check size={18} className="text-accent shrink-0 mt-0.5" /> {t}</li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="relative">
            <svg viewBox="0 0 360 300" role="img" aria-label="Rede mesh: a antena no centro e repetidores que estendem o sinal." className="w-full max-w-md mx-auto h-auto">
              <g stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.55">
                <line x1="180" y1="150" x2="80" y2="80" /><line x1="180" y1="150" x2="290" y2="90" />
                <line x1="180" y1="150" x2="90" y2="230" /><line x1="180" y1="150" x2="285" y2="225" />
              </g>
              <circle cx="180" cy="150" r="54" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.22" />
              <circle cx="180" cy="150" r="78" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.12" />
              <g fontFamily="ui-monospace,monospace" fontSize="10" fill="var(--muted)" textAnchor="middle">
                <circle cx="180" cy="150" r="26" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.6" />
                <path d="M168 153a17 17 0 0 1 24 0" fill="none" stroke="var(--accent)" strokeWidth="1.7" />
                <path d="M173 148a9 9 0 0 1 14 0" fill="none" stroke="var(--accent)" strokeWidth="1.7" />
                <circle cx="180" cy="157" r="2.2" fill="var(--accent)" />
                <text x="180" y="196">Starlink</text>
                <g>
                  <circle cx="80" cy="80" r="15" fill="var(--card)" stroke={MINI} strokeWidth="1.4" /><circle cx="80" cy="80" r="4" fill={MINI} />
                  <circle cx="290" cy="90" r="15" fill="var(--card)" stroke={MINI} strokeWidth="1.4" /><circle cx="290" cy="90" r="4" fill={MINI} />
                  <circle cx="90" cy="230" r="15" fill="var(--card)" stroke={MINI} strokeWidth="1.4" /><circle cx="90" cy="230" r="4" fill={MINI} />
                  <circle cx="285" cy="225" r="15" fill="var(--card)" stroke={MINI} strokeWidth="1.4" /><circle cx="285" cy="225" r="4" fill={MINI} />
                </g>
                <text x="80" y="56">repetidor</text><text x="290" y="66">repetidor</text>
                <text x="90" y="260">repetidor</text><text x="285" y="255">repetidor</text>
              </g>
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-28">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />
          <motion.span {...fadeUp(0)} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-5 block relative">Fale connosco</motion.span>
          <motion.h2 {...fadeUp(0.05)} className="text-4xl md:text-6xl font-display font-medium text-fg tracking-tighter mb-6 relative">
            Dizemos-lhe qual chega<br />bem à sua casa.
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-muted text-lg max-w-lg mx-auto mb-10 relative">
            Conte-nos quantas divisões tem e onde fica — respondemos com a antena certa e um orçamento.
          </motion.p>
          <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-4 justify-center relative">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 transition">
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
            <Link to="/aderir" className="inline-flex items-center gap-3 px-8 py-4 border border-line text-fg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-accent/60 hover:text-accent transition">
              <MapPin size={16} /> Pedir instalação
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

/* ---------- Cartão de produto ---------- */
function ProductCard(props: {
  variant: "mini" | "std";
  featured?: boolean;
  tag: string;
  tagIcon: typeof Backpack;
  media: ReactNode;
  name: string;
  forWho: string;
  specs: Spec[];
  cta: string;
  wa: string;
  price: string;
  priceNote: string;
}) {
  const { variant, featured, tag, tagIcon: TagIcon, media, name, forWho, specs, cta, wa, price, priceNote } = props;
  const color = variant === "mini" ? MINI : "var(--accent)";
  const glow = variant === "mini" ? "rgba(122,184,255,0.10)" : "rgba(0,229,255,0.10)";

  return (
    <motion.article
      {...fadeUp(variant === "std" ? 0.1 : 0)}
      className={`border bg-bg overflow-hidden flex flex-col ${featured ? "border-accent/50" : "border-line"}`}
    >
      {/* media 3D interativo (arraste para rodar) */}
      <div className="relative h-64 border-b border-line overflow-hidden" style={{ background: `radial-gradient(120% 90% at 50% 15%, ${glow}, transparent 60%)` }}>
        <span className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border bg-bg/60 backdrop-blur-sm" style={{ color, borderColor: color }}>
          <TagIcon size={12} /> {tag}
        </span>
        <span className="absolute bottom-3 left-3 z-10 font-mono text-[9px] uppercase tracking-widest text-muted/60">360° · arraste para rodar</span>
        <div className="absolute inset-0">{media}</div>
      </div>

      <div className="p-7 flex flex-col flex-1">
        <h3 className="text-2xl font-display font-medium text-fg">{name}</h3>
        <p className="text-muted text-sm mt-2">{forWho}</p>

        <ul className="mt-6 mb-2">
          {specs.map((s) => (
            <li key={s.k} className="flex items-center justify-between gap-4 py-3 border-t border-line/60 text-sm">
              <span className="text-muted flex items-center gap-2.5"><s.icon size={15} style={{ color }} /> {s.k}</span>
              <span className="text-fg font-medium tabular-nums text-right">{s.v}</span>
            </li>
          ))}
        </ul>

        {/* preço de referência (equipamento) */}
        <div className="mt-5 p-4 border border-line bg-card flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted/70">Preço</div>
            <div className="text-xs text-muted/70 mt-0.5">{priceNote}</div>
          </div>
          <div className="text-2xl font-display text-fg tabular-nums">{price}</div>
        </div>

        <div className="mt-5 flex gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] font-bold text-bg transition hover:brightness-110"
            style={{ background: color }}>
            {cta}
          </a>
          <Link to="/como-funciona" className="inline-flex items-center justify-center gap-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] font-bold border border-line text-fg hover:border-accent/60 hover:text-accent transition">
            <Router size={14} /> Detalhes
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
