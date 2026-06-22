import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

// Alturas das barras (%) — sobem da esquerda para a direita = crescimento.
const BARS = [18, 28, 24, 40, 36, 55, 50, 70, 64, 88, 100];

export default function PromotoresBand() {
  // Contador de comissão a "crescer" em loop.
  const count = useMotionValue(0);
  const texto = useTransform(count, (v) => `${Math.round(v).toLocaleString("pt-PT")} MT`);

  useEffect(() => {
    const controls = animate(count, 9600, {
      duration: 2.4, ease: "easeOut", repeat: Infinity, repeatType: "reverse", repeatDelay: 1.2,
    });
    return () => controls.stop();
  }, [count]);

  return (
    <section id="promotores" className="py-32 border-t border-line bg-card relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-accent opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Texto — mínimo */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Programa de Promotores</span>
          <h2 className="font-display text-4xl md:text-6xl font-medium text-fg tracking-tighter mb-6 leading-[0.95]">Ganhe<br />a crescer.</h2>
          <p className="text-muted font-light text-lg border-l border-line pl-6 mb-10 max-w-xs">8% de cada cliente que trouxer. Todos os meses.</p>
          <Link to="/promotor" className="group inline-flex items-center gap-3 px-10 py-5 bg-fg text-bg font-mono text-xs tracking-[0.2em] uppercase font-bold overflow-hidden relative">
            <span className="relative z-10">Área de promotor</span>
            <ArrowUpRight size={18} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            <div className="absolute inset-0 w-0 bg-accent transition-all duration-300 ease-out group-hover:w-full" />
          </Link>
        </motion.div>

        {/* Gráfico animado */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="glass-panel p-8 md:p-10 h-[380px] flex flex-col">
          <div className="flex items-end justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-faint">Comissão acumulada</span>
            <span className="font-mono text-accent text-[11px] flex items-center gap-1"><ArrowUpRight size={13} /> +8% / cliente</span>
          </div>
          <motion.div className="font-display text-4xl md:text-5xl text-accent mb-6 tabular-nums">{texto}</motion.div>

          <div className="flex-1 flex items-end gap-1.5 md:gap-2">
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatType: "reverse", repeatDelay: 1.4 }}
                style={{ height: `${h}%`, transformOrigin: "bottom" }}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-accent/25 to-accent"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
