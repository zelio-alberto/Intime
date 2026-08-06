import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, entrarComGoogle, mensagemErroAuth, dentroDeAppBrowser } from "../firebase";
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
  const [user, setUser] = useState<{ email: string; uid: string; name: string; foto: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authPronto, setAuthPronto] = useState(false);
  const [introDispensado, setIntroDispensado] = useState(false);

  // Sessão Google: cria/identifica a conta e liga o pedido à pessoa.
  // Sugere nome e email nos campos (a pessoa pode alterar o email de contacto).
  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (u?.email) {
      setUser({ email: u.email, uid: u.uid, name: u.displayName || "", foto: u.photoURL || "" });
      setForm((f) => ({
        ...f,
        nome: f.nome.trim() ? f.nome : (u.displayName || f.nome),
        email: f.email.trim() ? f.email : (u.email || ""),
      }));
    } else setUser(null);
    setAuthPronto(true);
  }), []);

  // Convite de boas-vindas: mal se entra em "Pedir instalação", propomos ligar
  // a conta Google para criar o pré-registo (dispensável — dá para preencher à mão).
  const mostrarIntro = authPronto && !user && !introDispensado && !done;

  const [authErro, setAuthErro] = useState("");
  const entrarGoogle = async () => {
    setAuthBusy(true);
    setAuthErro("");
    try { await entrarComGoogle(); } catch (e) { setAuthErro(mensagemErroAuth(e)); }
    finally { setAuthBusy(false); }
  };

  // Caixa de login Google — aparece no início da identificação (capta nome+email
  // e pré-preenche; tudo continua editável) e repete no Confirmar se ainda faltar.
  const caixaGoogle = user ? null : (
    <div className="border border-line bg-card p-5 mb-6">
      <p className="text-sm text-muted mb-4">Entre com Google e preenchemos os seus dados por si — pode alterá-los a seguir. A conta serve para acompanhar o estado do pedido.</p>
      {dentroDeAppBrowser() && (
        <p className="text-sm text-accent mb-4">Está a ver o site dentro do WhatsApp e o Google não permite login aqui. Toque nos três pontos (⋮) no canto e escolha <b>“Abrir no navegador”</b> (Chrome), depois continue.</p>
      )}
      <button type="button" onClick={entrarGoogle} disabled={authBusy}
        className="inline-flex items-center gap-2 px-6 py-3.5 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
        <UserIcon size={15} /> {authBusy ? "A entrar…" : "Entrar com Google"}
      </button>
      {authErro && <p className="text-sm text-accent mt-3">{authErro}</p>}
    </div>
  );

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
    if (!user) { setAuthErro("Falta só entrar com Google (botão acima) para enviar o pedido."); return; }
    if (!aceite) return;
    setSending(true);
    try {
      const promotor = getRef();
      // O pedido fica ligado ao email indicado no formulário (é com ele que o
      // dono acompanha o estado em /conta); sem email digitado, usa o da sessão.
      // Quem preencheu com outra sessão Google fica registado em criadoPorEmail.
      const emailPedido = form.email.trim().toLowerCase() || user.email.toLowerCase();
      const { email: _e, ...resto } = form;
      await addDoc(collection(db, "inscricoes"), {
        ...resto, plano: planName, planoId: planId, status: "novo",
        email: emailPedido, uid: user.uid,
        ...(emailPedido !== user.email.toLowerCase() ? { criadoPorEmail: user.email.toLowerCase() } : {}),
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
      {/* Convite inicial: liga a conta Google e o pré-registo preenche-se sozinho */}
      <AnimatePresence>
        {mostrarIntro && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-bg/85 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full max-w-md border border-line bg-card p-8 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Adesão Intime</motion.span>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="font-display text-3xl text-fg mb-3">Vamos preparar o seu pedido.</motion.h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="text-muted text-sm leading-relaxed mb-6">Ligue a sua conta Google e criamos o seu pré-registo num toque — nome e email preenchidos por si. Pode alterar tudo antes de enviar.</motion.p>
              {dentroDeAppBrowser() && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-accent mb-5">
                  Está a ver o site dentro do WhatsApp e o Google não permite login aqui. Toque nos três pontos (⋮) e escolha <b>“Abrir no navegador”</b>, depois continue.
                </motion.p>
              )}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-2">
                <button type="button" onClick={entrarGoogle} disabled={authBusy}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
                  <UserIcon size={15} /> {authBusy ? "A entrar…" : "Continuar com Google"}
                </button>
                <button type="button" onClick={() => setIntroDispensado(true)}
                  className="w-full text-center font-mono text-[10px] uppercase tracking-widest text-faint hover:text-fg transition-colors py-2.5">
                  Prefiro preencher manualmente
                </button>
              </motion.div>
              {authErro && <p className="text-sm text-accent mt-4">{authErro}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {caixaGoogle}
                    {user && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                        className="flex items-center gap-3 border border-accent/30 bg-accent/[0.05] px-4 py-3 mb-6">
                        {user.foto ? (
                          <img src={user.foto} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border border-line shrink-0" />
                        ) : (
                          <Check size={16} className="text-accent shrink-0" />
                        )}
                        <span className="text-xs text-muted leading-relaxed">Pré-registo criado com a conta <b className="text-fg">{user.email}</b>. Confirme ou altere o que quiser abaixo.</span>
                      </motion.div>
                    )}
                    <div className="space-y-5">
                      <div><label className={lbl}>Nome completo *</label><input autoFocus required className={field} value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
                      <div><label className={lbl}>Número de WhatsApp *</label><input required className={field} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+258 8x xxx xxxx" /></div>
                      <div>
                        <label className={lbl}>Email de contacto</label>
                        <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="oseu@email.com" />
                        {user && form.email.trim().toLowerCase() === user.email.toLowerCase() ? (
                          <p className="text-faint text-xs mt-2">Sugerido da sua conta Google — confirme ou escreva outro, se preferir.</p>
                        ) : user && form.email.trim() ? (
                          <p className="text-faint text-xs mt-2">O pedido fica ligado a este email — é com ele que se acompanha o estado em “Entrar”.</p>
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
                          {form.email.trim() && form.email.trim().toLowerCase() !== user.email.toLowerCase() ? (
                            <>Pedido ligado a <b className="text-fg">{form.email.trim().toLowerCase()}</b> — o estado acompanha-se em <b className="text-fg">“Entrar”</b> com esse email.</>
                          ) : (
                            <>Pedido ligado à conta <b className="text-fg">{user.email}</b>. Vai poder acompanhar o estado em <b className="text-fg">“Entrar”</b>.</>
                          )}
                        </span>
                      </div>
                    ) : (
                      caixaGoogle
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
              <button type="submit" disabled={!aceite || sending}
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
