import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { db, auth, googleProvider } from "../firebase";
import Layout from "../components/Layout";
import LocationFields from "../components/LocationFields";
import { useSiteConfig } from "../useSiteConfig";
import { getRef } from "../referral";
import { clsx } from "clsx";
import { Check, CheckCircle2, MessageCircle, ChevronLeft, ArrowRight, Repeat, User as UserIcon } from "lucide-react";

const field = "w-full bg-bg border border-line px-4 py-4 text-base text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";

const STEPS = ["plano", "identificacao", "local", "espaco", "confirmar"] as const;

export default function Aderir() {
  const cfg = useSiteConfig();
  const [params] = useSearchParams();
  const preplan = params.get("plano");
  const hasPre = !!cfg.plans.find((p) => p.id === preplan);

  const [[step, dir], setStep] = useState<[number, number]>([hasPre ? 1 : 0, 1]);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", cidade: "", bairro: "", tipo: "Casa", horario: "Qualquer hora", gps: "" });
  const [planId, setPlanId] = useState(preplan || cfg.plans.find((p) => p.featured)?.id || cfg.plans[0]?.id || "");
  const [aceite, setAceite] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [user, setUser] = useState<{ email: string; uid: string; name: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Sessão Google: cria/identifica a conta e liga o pedido à pessoa.
  // Sugere nome e email nos campos (a pessoa pode alterar o email de contacto).
  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (u?.email) {
      setUser({ email: u.email, uid: u.uid, name: u.displayName || "" });
      setForm((f) => ({
        ...f,
        nome: f.nome.trim() ? f.nome : (u.displayName || f.nome),
        email: f.email.trim() ? f.email : (u.email || ""),
      }));
    } else setUser(null);
  }), []);

  const entrarGoogle = async () => {
    setAuthBusy(true);
    try { await signInWithPopup(auth, googleProvider); } catch { /* cancelado */ }
    finally { setAuthBusy(false); }
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const plan = cfg.plans.find((p) => p.id === planId);
  const planName = plan?.name || "";
  const key = STEPS[step];
  const last = STEPS.length - 1;

  const canNext = () => {
    if (key === "plano") return !!planId;
    if (key === "identificacao") return form.nome.trim() && form.whatsapp.trim();
    if (key === "local") return form.cidade.trim() && form.bairro.trim();
    return true;
  };
  const go = (d: number) => setStep(([s]) => [Math.min(Math.max(s + d, 0), last), d]);

  const waUrl = `https://wa.me/${cfg.contacts.whatsapp}?text=${`Olá Intime! Quero pedir instalação.%0A%0APacote: ${planName}%0ANome: ${form.nome}%0AWhatsApp: ${form.whatsapp}%0ACidade/Província: ${form.cidade}%0ABairro: ${form.bairro}%0AEspaço: ${form.tipo}%0AMelhor horário: ${form.horario}${form.gps ? `%0AGPS: ${form.gps}` : ""}`}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!aceite || !user) return;
    setSending(true);
    try {
      const promotor = getRef();
      // `email` é sempre o da conta Google (elo com /conta e regras);
      // se a pessoa indicou outro para contacto, vai em `emailContacto`.
      const contacto = form.email.trim().toLowerCase();
      const { email: _e, ...resto } = form;
      await addDoc(collection(db, "inscricoes"), {
        ...resto, plano: planName, planoId: planId, status: "novo",
        email: user.email.toLowerCase(), uid: user.uid,
        ...(contacto && contacto !== user.email.toLowerCase() ? { emailContacto: contacto } : {}),
        ...(promotor ? { promotor } : {}),
        createdAt: serverTimestamp(),
      });
    } catch { /* sem regras / offline */ }
    setSending(false);
    setDone(true);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
  };

  if (done) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center px-6 pt-32 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg text-center">
            <CheckCircle2 size={56} className="text-accent mx-auto mb-8" />
            <h1 className="font-display text-4xl md:text-5xl text-fg mb-5">Pedido enviado!</h1>
            <p className="text-muted text-lg mb-10">
              Recebemos o seu pedido para o pacote <b className="text-fg">{planName}</b>. A equipa da Intime entra em contacto para confirmar a disponibilidade e agendar a avaliação. Para ser mais rápido, fale connosco no WhatsApp:
            </p>
            <a href={waUrl} className="inline-flex items-center gap-3 px-10 py-5 bg-[#25D366] text-white font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#20bd5a] transition-colors">
              <MessageCircle size={18} /> Continuar no WhatsApp
            </a>
          </motion.div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-40 pb-12 border-b border-line bg-card">
        <div className="max-w-[760px] mx-auto px-6">
          <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Adesão</span>
          <h1 className="text-4xl md:text-5xl font-display font-medium text-fg tracking-tighter">Pedir instalação</h1>
        </div>
      </section>

      <div className="max-w-[760px] mx-auto px-6 py-12">
        {/* Pacote escolhido + progresso */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {plan && key !== "plano" && (
            <div className="flex items-center gap-3">
              {plan.image && <img src={plan.image} alt="" className="w-10 h-10 object-contain" />}
              <div>
                <div className="font-display text-lg text-fg leading-none">{plan.name}</div>
                <button type="button" onClick={() => setStep([0, -1])} className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-accent transition-colors flex items-center gap-1 mt-1">
                  <Repeat size={11} /> Trocar pacote
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {STEPS.map((_, i) => (
              <span key={i} className={clsx("h-1.5 rounded-full transition-all duration-300", i === step ? "w-7 bg-accent" : i < step ? "w-3 bg-accent/50" : "w-3 bg-line")} />
            ))}
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="relative min-h-[320px]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={key} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: "easeOut" }}>

                {key === "plano" && (
                  <div>
                    <h2 className="font-display text-2xl text-fg mb-1">Escolha um pacote</h2>
                    <p className="text-muted text-sm mb-6">Pode mudar depois, durante a avaliação.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {cfg.plans.map((p) => (
                        <button type="button" key={p.id} onClick={() => setPlanId(p.id)}
                          className={clsx("text-left border p-5 transition-colors", planId === p.id ? "border-accent bg-accent/[0.06]" : "border-line hover:border-line/60")}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-display text-lg text-fg">{p.name}</span>
                            {planId === p.id && <Check size={16} className="text-accent" />}
                          </div>
                          <div className="font-mono text-[11px] text-faint uppercase tracking-widest mb-1">{p.idealFor}</div>
                          <div className="font-display text-xl text-fg">{p.from && <span className="text-[11px] font-mono text-faint uppercase mr-1">desde</span>}{p.price} <span className="text-xs font-mono text-faint uppercase">{p.unit}</span></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {key === "identificacao" && (
                  <div>
                    <h2 className="font-display text-2xl text-fg mb-1">Como o contactamos?</h2>
                    <p className="text-muted text-sm mb-6">Nome, WhatsApp e email de contacto.</p>
                    <div className="space-y-5">
                      <div><label className={lbl}>Nome completo *</label><input autoFocus required className={field} value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
                      <div><label className={lbl}>Número de WhatsApp *</label><input required className={field} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+258 8x xxx xxxx" /></div>
                      <div>
                        <label className={lbl}>Email de contacto</label>
                        <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="oseu@email.com" />
                        {user && form.email.trim().toLowerCase() === user.email.toLowerCase() ? (
                          <p className="text-faint text-xs mt-2">Sugerido da sua conta Google — confirme ou escreva outro, se preferir.</p>
                        ) : user && form.email.trim() ? (
                          <p className="text-faint text-xs mt-2">Vamos contactá-lo por este email; a conta continua ligada a <b className="text-muted">{user.email}</b>.</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {key === "local" && (
                  <div>
                    <h2 className="font-display text-2xl text-fg mb-1">Onde fica?</h2>
                    <p className="text-muted text-sm mb-6">Escreva e escolha uma sugestão, ou use a sua localização atual.</p>
                    <LocationFields
                      cidade={form.cidade}
                      bairro={form.bairro}
                      onCidade={(v) => set("cidade", v)}
                      onBairro={(v) => set("bairro", v)}
                      onGps={(v) => set("gps", v)}
                    />
                  </div>
                )}

                {key === "espaco" && (
                  <div>
                    <h2 className="font-display text-2xl text-fg mb-1">Mais um detalhe</h2>
                    <p className="text-muted text-sm mb-6">Ajuda-nos a recomendar a melhor solução.</p>
                    <div className="space-y-5">
                      <div>
                        <label className={lbl}>Tipo de espaço</label>
                        <select className={field} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                          <option>Casa</option><option>Loja</option><option>Escritório</option><option>Escola</option><option>Fazenda</option><option>Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Melhor horário para contacto</label>
                        <select className={field} value={form.horario} onChange={(e) => set("horario", e.target.value)}>
                          <option>Qualquer hora</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {key === "confirmar" && (
                  <div>
                    <h2 className="font-display text-2xl text-fg mb-1">Confirmar pedido</h2>
                    <p className="text-muted text-sm mb-6">Verifique e envie. É rápido.</p>
                    <div className="border border-line bg-card p-5 mb-5 space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-faint">Pacote</span><span className="text-fg font-medium text-right">{planName}</span></div>
                      {cfg.taxaInstalacao.mostrar && cfg.taxaInstalacao.valor && (
                        <div className="flex justify-between gap-4"><span className="text-faint">Taxa de adesão/instalação</span><span className="text-fg text-right">{cfg.taxaInstalacao.valor} {cfg.taxaInstalacao.unidade} <span className="text-faint">(pagamento único)</span></span></div>
                      )}
                      <div className="flex justify-between gap-4"><span className="text-faint">Nome</span><span className="text-fg text-right">{form.nome}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-faint">WhatsApp</span><span className="text-fg text-right">{form.whatsapp}</span></div>
                      {form.email.trim() && (
                        <div className="flex justify-between gap-4"><span className="text-faint">Email de contacto</span><span className="text-fg text-right">{form.email.trim()}</span></div>
                      )}
                      <div className="flex justify-between gap-4"><span className="text-faint">Local</span><span className="text-fg text-right">{form.bairro}, {form.cidade}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-faint">Espaço · Horário</span><span className="text-fg text-right">{form.tipo} · {form.horario}</span></div>
                    </div>

                    {/* Conta: autenticar com Google cria a conta e liga o pedido à pessoa (capta o email) */}
                    {user ? (
                      <div className="flex items-start gap-3 border border-line bg-card p-4 mb-5 text-sm">
                        <Check size={16} className="text-accent shrink-0 mt-0.5" />
                        <span className="text-muted">
                          Pedido ligado à conta <b className="text-fg">{user.email}</b>. Vai poder acompanhar o estado em <b className="text-fg">“Entrar”</b>.
                          {form.email.trim() && form.email.trim().toLowerCase() !== user.email.toLowerCase() && (
                            <> Contacto por email: <b className="text-fg">{form.email.trim()}</b>.</>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="border border-line bg-card p-5 mb-5">
                        <p className="text-sm text-muted mb-4">Entre com Google para criar a sua conta e acompanhar o estado do pedido. Usamos o seu email só para isto.</p>
                        <button type="button" onClick={entrarGoogle} disabled={authBusy}
                          className="inline-flex items-center gap-2 px-6 py-3.5 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
                          <UserIcon size={15} /> {authBusy ? "A entrar…" : "Entrar com Google"}
                        </button>
                      </div>
                    )}

                    <label className="flex items-start gap-3 text-sm text-muted cursor-pointer mb-2">
                      <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 accent-[var(--accent)]" />
                      <span>Autorizo a Intime a contactar-me para confirmar disponibilidade, condições de instalação e adesão ao serviço. Os meus dados não serão usados para outros fins sem autorização.</span>
                    </label>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navegação */}
          <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-line">
            <button type="button" onClick={() => go(-1)} disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-fg transition-colors disabled:opacity-0">
              <ChevronLeft size={16} /> Voltar
            </button>

            {step < last ? (
              <button type="button" onClick={() => go(1)} disabled={!canNext()}
                className="inline-flex items-center gap-2 px-8 py-4 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar <ArrowRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={!aceite || !user || sending}
                className="inline-flex items-center gap-2 px-8 py-4 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {sending ? "A enviar..." : "Enviar pedido"}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
