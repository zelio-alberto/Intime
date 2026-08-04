import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import Layout from "../components/Layout";
import { ChevronRight, ArrowUpRight, Zap, Target, Globe, Satellite } from "lucide-react";
import { useSiteConfig } from "../useSiteConfig";
import PlansSlider from "../components/PlansSlider";
import RotatingText from "../components/RotatingText";
import PromotoresBand from "../components/PromotoresBand";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const cfg = useSiteConfig();

  return (
    <Layout>
      {/* HERO (always dark / cinematic) */}
      <section className="force-dark relative h-[100svh] min-h-[700px] flex items-center justify-center overflow-hidden border-b border-line bg-bg">
        <motion.div style={{ y }} className="absolute inset-0 z-0">
           <video autoPlay muted loop playsInline poster="/earth-mozambique.png" className="w-full h-full object-cover opacity-50">
             <source src="/starlink-3d.mp4" type="video/mp4" />
           </video>
           <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/20 to-transparent"></div>
        </motion.div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 mt-12">
           <div className="max-w-5xl">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
               <div className="h-px w-8 bg-accent"></div>
               <span className="font-mono text-accent tracking-[0.2em] text-xs uppercase">Internet Starlink · Moçambique</span>
             </motion.div>
             
             <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[clamp(2.75rem,7vw,6.5rem)] font-display font-medium text-fg mb-6 leading-[0.95] tracking-tighter uppercase">
               Onde há Intime, <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-600">há conexão.</span>
             </motion.h1>

             <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-2xl mb-12 border-l border-line pl-6">
               <div className="text-2xl md:text-4xl text-fg font-light leading-tight min-h-[3rem] md:min-h-[3.5rem]">
                 <RotatingText items={cfg.taglines} />
               </div>
               <p className="text-base md:text-lg text-muted font-light mt-4">
                 Escolha a sua internet <strong className="text-fg font-medium">Starlink</strong> — a Intime faz acontecer. Para a sua casa ou negócio.
               </p>
             </motion.div>

             <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center gap-8 md:gap-14">
               <Link to="/aderir" className="group relative px-10 py-5 bg-fg text-bg font-mono text-xs tracking-[0.2em] uppercase overflow-hidden flex items-center gap-3">
                 <span className="relative z-10 font-bold">Pedir instalação</span>
                 <ArrowUpRight size={18} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 <div className="absolute inset-0 w-0 bg-accent transition-all duration-[350ms] ease-out group-hover:w-full"></div>
               </Link>
               <div className="flex flex-col">
                 <span className="font-mono text-[10px] text-faint uppercase tracking-widest mb-1">{cfg.hero.priceLabel}</span>
                 <span className="font-display text-4xl text-fg tracking-tight">{cfg.hero.price}<span className="text-base text-faint tracking-normal ml-2">{cfg.hero.unit}</span></span>
               </div>
             </motion.div>
           </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:px-12 flex justify-between items-end font-mono text-[10px] text-faint uppercase tracking-widest">
            <span>SYS.INTIME.2026</span>
            <span className="text-right text-accent">SINAL FORTE<br/>LAT: 18.66° S</span>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-b border-line bg-card py-4 overflow-hidden relative flex">
         <div className="animate-[marquee_20s_linear_infinite] whitespace-nowrap flex gap-16 font-mono text-xs text-faint uppercase tracking-[0.2em]">
            <span>Cobertura em todo o país</span>
            <span className="text-accent">●</span>
            <span>Instalação profissional</span>
            <span className="text-accent">●</span>
            <span>Ativação Rápida</span>
            <span className="text-accent">●</span>
            <span>Baixa Latência Operacional</span>
            <span className="text-accent">●</span>
            <span>Cobertura em todo o país</span>
            <span className="text-accent">●</span>
            <span>Instalação profissional</span>
            <span className="text-accent">●</span>
            <span>Ativação Rápida</span>
            <span className="text-accent">●</span>
            <span>Baixa Latência Operacional</span>
         </div>
      </div>

      {/* BENTO GRID */}
      <section className="py-32 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="mb-20">
            <h2 className="font-display text-4xl md:text-6xl font-medium tracking-tight mb-4 text-fg">Vantagem Tática.</h2>
            <p className="font-mono text-accent uppercase tracking-[0.2em] text-xs">Parâmetros do Sistema Starlink</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto min-h-[640px]">
            {/* Block 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 glass-panel p-10 lg:p-14 flex flex-col justify-between group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 mb-20 lg:mb-32">
                <Zap className="text-accent mb-8" size={32} />
                <h3 className="font-display text-4xl text-fg mb-4">Velocidade Extrema</h3>
                <p className="text-muted font-light max-w-sm text-lg">Downloads massivos instantâneos. Streaming em 4K sem cortes. Latência mínima para operações críticas.</p>
              </div>
              <div className="relative z-10 font-mono text-[clamp(4rem,10vw,8rem)] leading-none text-fg/5 font-bold tracking-tighter">
                250+ MBPS
              </div>
            </motion.div>

            {/* Block 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="glass-panel p-10 lg:p-14 flex flex-col justify-between group overflow-hidden relative"
            >
              <div className="relative z-10 mb-12">
                <Target className="text-fg mb-8" size={32} />
                <h3 className="font-display text-3xl text-fg mb-4">Precisão</h3>
                <p className="text-muted font-light">A antena baseia-se num sistema motorizado avançado, alinhando-se automaticamente à constelação de satélites em tempo real.</p>
              </div>
              <div className="w-full h-[2px] bg-fg/10 overflow-hidden relative z-10 mt-auto">
                 <div className="h-full bg-accent w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[1500ms] ease-out"></div>
              </div>
            </motion.div>

            {/* Block 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="glass-panel p-10 lg:p-14 flex flex-col justify-between group"
            >
              <Globe className="text-fg mb-8" size={32} />
              <div>
                <h3 className="font-display text-3xl text-fg mb-4">Cobertura Global</h3>
                <p className="text-muted font-light">Desenhado para áreas remotas. Onde quer que se encontre a sua fazenda, estaleiro ou vila, entregamos máxima estabilidade.</p>
              </div>
            </motion.div>

            {/* Block 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="md:col-span-2 glass-panel p-10 lg:p-14 flex flex-col items-start justify-between group overflow-hidden relative border-accent/20 bg-accent/[0.02] hover:bg-accent/10 transition-colors duration-500"
            >
              <div className="relative z-10 max-w-lg mb-12">
                <Satellite className="text-accent mb-8" size={32} />
                <h3 className="font-display text-4xl text-fg mb-4">Gestão Integral Intime</h3>
                <p className="text-muted font-light text-lg">Não necessita de competências técnicas. A Intime avalia o terreno, importa, instala as infraestruturas, configura a rede Wi-Fi e mantém monitorização contínua sobre a sua malha.</p>
              </div>
              <Link to="/como-funciona" className="relative z-10 font-mono text-xs uppercase tracking-[0.2em] text-accent flex items-center gap-3 group-hover:gap-5 transition-all">
                Como funciona <ChevronRight size={16} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING / MATRIX */}
      <section id="planos" className="py-32 border-t border-line relative bg-card">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent opacity-[0.02] blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
             <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4 text-fg">Pacotes Intime.</h2>
             <p className="font-mono text-faint uppercase tracking-widest text-xs">Soluções para casas, negócios e instituições · a partir de {cfg.hero.price} {cfg.hero.unit}</p>
          </motion.div>

          {/* Slider animado de pacotes */}
          <PlansSlider plans={cfg.plans} taxa={cfg.taxaInstalacao} />
          <p className="font-mono text-[11px] text-faint mt-8 max-w-3xl normal-case leading-relaxed">
            Os valores podem variar conforme o tipo de equipamento, o número de routers adicionais, o tamanho do espaço, a localização e as condições de instalação. As velocidades indicadas são máximas disponíveis, não garantidas. A adesão está sujeita a avaliação técnica, taxa de adesão/instalação{cfg.taxaInstalacao.mostrar && cfg.taxaInstalacao.valor ? ` de ${cfg.taxaInstalacao.valor} ${cfg.taxaInstalacao.unidade} (pagamento único)` : ""} e assinatura de termo de compromisso.{cfg.taxaInstalacao.mostrar && cfg.taxaInstalacao.valor && cfg.taxaInstalacao.nota ? ` ${cfg.taxaInstalacao.nota}` : ""}
          </p>
        </div>
      </section>

      {/* ROUTERS / COBERTURA WI-FI */}
      <section className="py-32 border-t border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4 text-fg">Cobertura Wi-Fi em toda a casa.</h2>
            <p className="text-muted font-light text-lg">Em casas maiores, o sinal pode não chegar bem a todas as divisões. Por isso, os pacotes Plus e Max podem incluir routers adicionais que estendem a rede Wi-Fi (mesh), para uma ligação estável em qualquer ponto.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { img: "/produtos/router-gen3.png", tag: "Router 3", title: "Mais alcance e velocidade", desc: "Wi-Fi 6 com rádios de banda tripla. Maior alcance, melhor desempenho e mais compatibilidade — estende a rede Wi-Fi por toda a casa, para uma ligação mais consistente, estável e rápida." },
              { img: "/produtos/router-mini.png", tag: "Router Mini", title: "Compacto, ideal como mesh", desc: "Router Wi-Fi 6 de banda dupla, compacto e eficiente. Excelente alcance e desempenho; perfeito como nó mesh para eliminar pontos mortos e garantir Wi-Fi em qualquer divisão." },
            ].map((r, i) => (
              <motion.div key={r.tag} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-panel p-8 md:p-10 flex flex-col sm:flex-row items-center gap-8 group">
                <div className="w-40 h-40 shrink-0 bg-gradient-to-br from-card to-bg flex items-center justify-center rounded-sm">
                  <img src={r.img} alt={r.tag} className="max-h-32 object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-xl" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{r.tag}</span>
                  <h3 className="font-display text-2xl text-fg mt-1 mb-3">{r.title}</h3>
                  <p className="text-muted font-light text-sm leading-relaxed">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMOTORES */}
      <PromotoresBand />

      {/* CTA / COMANDO */}
      <section id="comando" className="py-40 bg-card relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10 text-center">
            <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Ligação Direta</span>
            <h2 className="text-4xl md:text-7xl font-display font-medium text-fg mb-10 tracking-tighter uppercase">
              Iniciar <br/> Protocolo.
            </h2>
            <p className="text-muted border-l border-line pl-6 text-left max-w-lg mx-auto mb-16 font-light">
              A nossa equipa tática está pronta para analisar a sua área de receção orbital e alocar o equipamento correto. Resposta garantida em modo seguro (T-24h).
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <a href={`https://wa.me/${cfg.contacts.whatsapp}`} className="px-10 py-5 bg-[#25D366] text-white font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> Via WhatsApp
              </a>
              <a href={`mailto:${cfg.contacts.email}`} className="px-10 py-5 bg-transparent border border-line text-fg font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-fg hover:text-bg transition-colors flex items-center justify-center">
                Via Email
              </a>
            </div>
        </div>
      </section>
      
      {/* Global CSS for Tailwind Marquee (could also be plugin, but inline is fine) */}
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
      `}</style>
    </Layout>
  );
}
