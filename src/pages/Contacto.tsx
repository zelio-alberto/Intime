import { useState, type FormEvent } from "react";
import Layout from "../components/Layout";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useSiteConfig } from "../useSiteConfig";
import { MessageCircle, Mail, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";

const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";

export default function Contacto() {
  const cfg = useSiteConfig();
  const [form, setForm] = useState({ nome: "", contacto: "", assunto: "", mensagem: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const waUrl = `https://wa.me/${cfg.contacts.whatsapp}?text=${`Olá Intime!%0A%0ANome: ${form.nome}%0AContacto: ${form.contacto}%0AAssunto: ${form.assunto}%0AMensagem: ${form.mensagem}`}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await addDoc(collection(db, "mensagens"), { ...form, status: "novo", createdAt: serverTimestamp() });
    } catch { /* sem regras / offline */ }
    setSending(false);
    setDone(true);
  };

  const methods = [
    { icon: MessageCircle, label: "WhatsApp", value: cfg.contacts.phone, href: `https://wa.me/${cfg.contacts.whatsapp}`, hint: "Resposta rápida" },
    { icon: Mail, label: "Email", value: cfg.contacts.email, href: `mailto:${cfg.contacts.email}`, hint: "Comercial e suporte" },
    { icon: Phone, label: "Telefone", value: cfg.contacts.phone, href: `tel:${cfg.contacts.phone.replace(/\s/g, "")}`, hint: "Horário comercial" },
  ];

  return (
    <Layout>
      {/* HERO */}
      <section className="pt-48 pb-20 border-b border-line bg-card relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-accent opacity-[0.02] blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-6 block">Contactos</span>
          <h1 className="text-5xl md:text-7xl font-display font-medium text-fg tracking-tighter mb-6">Fale connosco.</h1>
          <p className="text-xl text-muted font-light max-w-2xl border-l border-line pl-6">
            Estamos prontos para avaliar a sua zona e apresentar a melhor solução. Escolha o canal que preferir.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_1.2fr] gap-16">
          {/* Métodos */}
          <div>
            <div className="space-y-4 mb-10">
              {methods.map((m) => (
                <a key={m.label} href={m.href} target="_blank" rel="noopener" className="flex items-center gap-5 border border-line p-5 hover:border-accent/50 hover:bg-card/40 transition-colors group">
                  <div className="w-12 h-12 grid place-items-center border border-line text-accent group-hover:bg-accent group-hover:text-bg transition-colors shrink-0"><m.icon size={20} /></div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-faint">{m.label}</div>
                    <div className="text-fg font-medium truncate">{m.value}</div>
                    <div className="text-xs text-faint">{m.hint}</div>
                  </div>
                </a>
              ))}
            </div>
            <div className="border border-line p-6 space-y-4">
              <div className="flex items-center gap-3 text-muted text-sm"><MapPin size={16} className="text-accent" /> Maputo, Moçambique · cobertura nacional</div>
              <div className="flex items-center gap-3 text-muted text-sm"><Clock size={16} className="text-accent" /> Seg–Sáb · 08h–18h</div>
            </div>
          </div>

          {/* Formulário */}
          {done ? (
            <div className="border border-line p-10 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={48} className="text-accent mb-6" />
              <h2 className="font-display text-3xl text-fg mb-3">Mensagem enviada!</h2>
              <p className="text-muted mb-8 max-w-sm">Obrigado pelo contacto. Respondemos o mais breve possível. Para ser mais rápido, fale connosco no WhatsApp.</p>
              <a href={waUrl} className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#20bd5a] transition-colors">
                <MessageCircle size={16} /> Continuar no WhatsApp
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="border border-line p-8 md:p-10">
              <h2 className="font-display text-2xl text-fg mb-6">Envie-nos uma mensagem</h2>
              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <div><label className={lbl}>Nome *</label><input required className={field} value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
                <div><label className={lbl}>Email ou telefone *</label><input required className={field} value={form.contacto} onChange={(e) => set("contacto", e.target.value)} /></div>
              </div>
              <div className="mb-5"><label className={lbl}>Assunto</label><input className={field} value={form.assunto} onChange={(e) => set("assunto", e.target.value)} /></div>
              <div className="mb-6"><label className={lbl}>Mensagem *</label><textarea required className={field + " min-h-[140px] resize-y"} value={form.mensagem} onChange={(e) => set("mensagem", e.target.value)} /></div>
              <button type="submit" disabled={sending} className="w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
                {sending ? "A enviar..." : "Enviar mensagem"}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
}
