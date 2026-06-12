import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Wifi, Cable, Gauge } from "lucide-react";
import type { Plan } from "../useSiteConfig";

export default function PlansSlider({ plans }: { plans: Plan[] }) {
  const n = plans.length;
  const [[page, dir], setPage] = useState<[number, number]>([0, 0]);
  const idx = ((page % n) + n) % n;
  const p = plans[idx];
  const go = (d: number) => setPage([page + d, d]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 70 : -70, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -70 : 70, opacity: 0 }),
  };

  return (
    <div className="relative">
      <div className="border border-line bg-card/40 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={page}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.x < -80) go(1); else if (info.offset.x > 80) go(-1); }}
            className="grid md:grid-cols-2 cursor-grab active:cursor-grabbing"
          >
            {/* Imagem do equipamento */}
            <div className="relative bg-gradient-to-br from-card to-bg flex items-center justify-center p-10 min-h-[300px] border-b md:border-b-0 md:border-r border-line overflow-hidden">
              {p.featured && <span className="absolute top-5 left-5 z-10 font-mono text-[9px] uppercase tracking-wider bg-accent text-bg px-2 py-1">Popular</span>}
              {p.image && (
                <motion.img
                  key={p.image + idx}
                  src={p.image}
                  alt={p.name}
                  draggable={false}
                  initial={{ scale: 0.9, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.12 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="max-h-[240px] object-contain drop-shadow-2xl cursor-pointer"
                />
              )}
            </div>

            {/* Detalhes */}
            <div className="p-8 md:p-12 flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">{p.idealFor}</span>
              <h3 className="font-display text-4xl text-fg mb-2">{p.name}</h3>
              {p.tagline && <p className="text-muted font-light mb-6">{p.tagline}</p>}

              <div className="flex items-baseline gap-2 mb-7">
                {p.from && <span className="font-mono text-[11px] text-faint uppercase tracking-wider">A partir de</span>}
                <span className="font-display text-5xl text-fg tracking-tight">{p.price}</span>
                <span className="font-mono text-xs text-faint uppercase tracking-widest">{p.unit}</span>
              </div>

              <div className="space-y-3 mb-6 text-[13.5px]">
                {p.speedDetail && <div className="flex items-start gap-3 text-muted"><Gauge size={16} className="text-accent shrink-0 mt-0.5" /> <span><b className="text-fg font-medium">Velocidade:</b> {p.speedDetail}</span></div>}
                {p.wifiInfo && <div className="flex items-start gap-3 text-muted"><Wifi size={16} className="text-accent shrink-0 mt-0.5" /> <span><b className="text-fg font-medium">Wi-Fi:</b> {p.wifiInfo}</span></div>}
                {p.wiredInfo && <div className="flex items-start gap-3 text-muted"><Cable size={16} className="text-accent shrink-0 mt-0.5" /> <span><b className="text-fg font-medium">Por cabo:</b> {p.wiredInfo}</span></div>}
              </div>

              <Link to={`/aderir?plano=${p.id}`} className="mt-auto inline-flex items-center justify-center py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors">
                Pedir instalação
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controlos */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          {plans.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage([i, i > idx ? 1 : -1])}
              aria-label={`Pacote ${i + 1}`}
              className={`h-1.5 transition-all duration-300 ${i === idx ? "w-8 bg-accent" : "w-3 bg-line hover:bg-faint"}`}
            />
          ))}
          <span className="ml-3 font-mono text-[11px] text-faint">{idx + 1} / {n} · deslize para ver mais</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => go(-1)} aria-label="Anterior" className="w-11 h-11 grid place-items-center border border-line text-fg hover:bg-fg hover:text-bg transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => go(1)} aria-label="Seguinte" className="w-11 h-11 grid place-items-center border border-line text-fg hover:bg-fg hover:text-bg transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}
