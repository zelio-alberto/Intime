import { motion } from "motion/react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useSiteConfig } from "../useSiteConfig";
import { MessageCircle, ShieldCheck, Wrench, Headset, FileText, Wallet, Building2, MapPin } from "lucide-react";

const steps = [
  { n: "01", title: "Peça uma avaliação", desc: "Fale connosco e indique a sua localização. É rápido e sem compromisso." },
  { n: "02", title: "Recebe a proposta", desc: "Apresentamos o plano recomendado, as condições de adesão e a disponibilidade técnica da sua zona." },
  { n: "03", title: "Assina o termo", desc: "Tudo com contrato claro — mensalidade, taxa de adesão e condições — para segurança das duas partes." },
  { n: "04", title: "Instalamos e ativamos", desc: "A nossa equipa instala e configura todo o sistema no local, e deixa a internet pronta a usar." },
  { n: "05", title: "Usa e paga mensalmente", desc: "Fica online, com suporte local da Intime, e paga a mensalidade conforme o plano contratado." },
];

const why = [
  { icon: Wallet, title: "Sem comprar equipamento", desc: "Não precisa de investir num kit caro. A solução é instalada e gerida pela Intime." },
  { icon: Wrench, title: "Instalação profissional", desc: "A nossa equipa trata da montagem, configuração e testes — fica a funcionar no mesmo dia." },
  { icon: Headset, title: "Suporte local", desc: "Equipa em Moçambique, por quem conhece o terreno. Sem ligar para o estrangeiro." },
  { icon: FileText, title: "Contrato transparente", desc: "Condições claras de mensalidade, adesão, equipamento e suporte, explicadas antes de assinar." },
  { icon: ShieldCheck, title: "Equipamento garantido", desc: "A manutenção e a substituição em caso de avaria são da responsabilidade da Intime." },
  { icon: Building2, title: "Para casas e negócios", desc: "Soluções ajustadas a residências, lojas, escritórios, fazendas e instituições." },
];

export default function ComoFunciona() {
  const cfg = useSiteConfig();

  return (
    <Layout>
      {/* HERO */}
      <section className="pt-48 pb-24 border-b border-line bg-card relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-accent opacity-[0.02] blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Como funciona</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-display font-medium text-fg tracking-tighter mb-8">
            Internet a funcionar, <br /> sem complicações.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-muted font-light max-w-2xl border-l border-line pl-6">
            A Intime trata de tudo — avaliação, equipamento, instalação e suporte. Você só liga e usa. Veja como é simples começar.
          </motion.p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="space-y-px">
            {steps.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="grid md:grid-cols-[120px_1fr] gap-6 md:gap-12 items-start py-10 border-b border-line group">
                <div className="font-display text-5xl md:text-6xl text-fg/15 group-hover:text-accent transition-colors duration-500">{s.n}</div>
                <div className="max-w-2xl">
                  <h3 className="font-display text-2xl md:text-3xl text-fg mb-3">{s.title}</h3>
                  <p className="text-muted font-light text-lg">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE BAND */}
      <section className="relative h-[55vh] min-h-[380px] overflow-hidden border-y border-line">
        <img src="/hero-instalacao.jpg" alt="Equipa da Intime a instalar uma antena" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40"></div>
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 pb-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2 flex items-center gap-2"><MapPin size={14} /> Instalação por equipa local</p>
            <h2 className="font-display text-3xl md:text-5xl text-white max-w-2xl">Montamos a solução por si.</h2>
          </div>
        </div>
      </section>

      {/* WHY INTIME */}
      <section className="py-32 bg-card">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 max-w-2xl">
            <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Porquê a Intime</span>
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-fg">Uma solução simples, do início ao fim.</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {why.map((w, i) => (
              <motion.div key={w.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1 }}
                className="border border-line p-8 hover:border-accent/40 transition-colors group">
                <w.icon size={26} className="text-accent mb-6" />
                <h3 className="font-display text-xl text-fg mb-3">{w.title}</h3>
                <p className="text-muted font-light text-sm leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-4xl md:text-6xl text-fg tracking-tighter mb-8">Pronto para começar?</h2>
            <p className="text-muted font-light text-lg max-w-xl mx-auto mb-12">Peça uma avaliação sem compromisso. Respondemos em menos de 24 horas com o plano e a antena certos para si.</p>
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
