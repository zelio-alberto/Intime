import { motion } from "motion/react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useSiteConfig } from "../useSiteConfig";
import { Target, Eye, HeartHandshake, Satellite, MapPin, Users, ShieldCheck, MessageCircle } from "lucide-react";

const values = [
  { icon: ShieldCheck, title: "Confiança", desc: "Contratos claros, condições transparentes e compromissos que cumprimos." },
  { icon: HeartHandshake, title: "Proximidade", desc: "Uma equipa local que acompanha o cliente do primeiro contacto ao suporte do dia a dia." },
  { icon: Satellite, title: "Inovação", desc: "Usamos a melhor tecnologia de internet por satélite para chegar onde as redes tradicionais não chegam." },
  { icon: Users, title: "Serviço completo", desc: "Tratamos de tudo — avaliação, equipamento, instalação e suporte — para o cliente só usar." },
];

export default function Sobre() {
  const cfg = useSiteConfig();

  return (
    <Layout>
      {/* HERO */}
      <section className="pt-48 pb-24 border-b border-line bg-card relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-accent opacity-[0.02] blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Quem somos</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-display font-medium text-fg tracking-tighter mb-8">
            Conectamos Moçambique, <br /> sem complicações.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted font-light max-w-2xl border-l border-line pl-6">
            A Intime é uma empresa moçambicana que leva internet de alta velocidade a casas e negócios — instalada, gerida e apoiada por uma equipa local.
          </motion.p>
        </div>
      </section>

      {/* INTRO */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-5 block">A nossa história</span>
            <h2 className="font-display text-4xl md:text-5xl text-fg tracking-tight mb-6">Internet de qualidade, ao alcance de todos.</h2>
            <div className="space-y-5 text-muted font-light text-lg leading-relaxed">
              <p>Em grande parte de Moçambique, ter internet rápida e estável ainda é um desafio — sobretudo fora dos grandes centros. A Intime nasceu para resolver isso de forma simples: o cliente não precisa de comprar equipamento caro nem de perceber de tecnologia.</p>
              <p>Tratamos de toda a solução — avaliação da zona, equipamento, instalação, configuração e suporte — para que cada casa, loja ou empresa fique online sem complicações, pagando apenas uma mensalidade.</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
            <img src="/antena-telhado-sunset.webp" alt="Antena Starlink instalada num telhado ao pôr-do-sol" className="w-full border border-line" />
            <div className="absolute -bottom-5 -left-5 bg-bg border border-line px-6 py-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">Operação</p>
              <p className="font-display text-xl text-fg flex items-center gap-2"><MapPin size={16} className="text-accent" /> Moçambique</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MISSÃO / VISÃO */}
      <section className="py-24 bg-card border-y border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border border-line p-10">
            <Target size={28} className="text-accent mb-6" />
            <h3 className="font-display text-3xl text-fg mb-4">A nossa missão</h3>
            <p className="text-muted font-light text-lg leading-relaxed">Levar internet rápida, estável e acessível a qualquer ponto de Moçambique, com instalação e suporte local, para que ninguém fique para trás na era digital.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="border border-line p-10">
            <Eye size={28} className="text-accent mb-6" />
            <h3 className="font-display text-3xl text-fg mb-4">A nossa visão</h3>
            <p className="text-muted font-light text-lg leading-relaxed">Ser a forma mais simples e de confiança de ter internet de qualidade em Moçambique — para famílias, negócios e instituições, em qualquer lugar.</p>
          </motion.div>
        </div>
      </section>

      {/* VALORES */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 max-w-2xl">
            <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Os nossos valores</span>
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-fg">O que nos move.</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.08 }}
                className="border border-line p-8 hover:border-accent/40 transition-colors">
                <v.icon size={26} className="text-accent mb-6" />
                <h3 className="font-display text-xl text-fg mb-3">{v.title}</h3>
                <p className="text-muted font-light text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-card border-t border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-4xl md:text-6xl text-fg tracking-tighter mb-8">Vamos conectar-nos?</h2>
            <p className="text-muted font-light text-lg max-w-xl mx-auto mb-12">Fale com a equipa da Intime. Avaliamos a sua zona e apresentamos a melhor solução para si.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link to="/aderir" className="px-10 py-5 bg-fg text-bg font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-accent transition-colors">Pedir instalação</Link>
              <a href={`https://wa.me/${cfg.contacts.whatsapp}`} className="px-10 py-5 bg-[#25D366] text-white font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-3">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
