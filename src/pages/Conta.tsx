import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { db, auth, googleProvider, storage } from "../firebase";
import {
  doc, getDoc, getDocs, setDoc, addDoc, collection, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { useSiteConfig } from "../useSiteConfig";
import {
  LogOut, Upload, MessageCircle, Check, Clock, X as XIcon,
  RefreshCcw, Ban, User as UserIcon, Copy, Link2, Users, UserCheck,
  Wallet, Wifi, Megaphone, ArrowRight,
} from "lucide-react";

/* ===========================================================================
   PÁGINA ÚNICA "A MINHA CONTA"
   Junta, na mesma página e de forma adaptativa:
     • Cliente   (portalContas)   — login nº conta+4díg OU Google
     • Lead      (inscricoes)     — pediu instalação, ainda sem Starlink
     • Promotor  (promotores)     — login Google
   O email Google é o elo que liga os papéis. O admin (/admin) NÃO entra aqui.
   =========================================================================== */

/* ---------- helpers (espelham models/account.dart) ---------- */
const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function mtValue(v: unknown): number {
  if (typeof v === "number") return v;
  const d = String(v ?? "").replace(/[^0-9]/g, "");
  return d ? parseFloat(d) : 0;
}
function emAtraso(e?: string) { const x = (e || "").toLowerCase(); return x.includes("atraso") || x.includes("suspens") || x.includes("dívida") || x.includes("divida"); }
function estadoOk(e?: string) { const x = (e || "").toLowerCase(); return x.includes("activ") || x.includes("ativ") || x.includes("em dia") || x.includes("regular"); }
function proximaData(d: DocumentData, hoje: Date): Date | null {
  const due = d.dueDate;
  if (due instanceof Timestamp) return due.toDate();
  const dia = parseInt(String(d.diaPagamento ?? "").replace(/[^0-9]/g, ""), 10);
  if (!dia || dia < 1 || dia > 31) return null;
  let y = hoje.getFullYear(), m = hoje.getMonth();
  if (hoje.getDate() > dia) { m++; if (m > 11) { m = 0; y++; } }
  const ultimo = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(dia, ultimo));
}
function dataExtenso(dt: Date) { return `${dt.getDate()} de ${MESES[dt.getMonth() + 1]} de ${dt.getFullYear()}`; }
function monthKey() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; }
function fmtTs(ts: unknown) {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return "";
}
function fmtData(ts: unknown) {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return "";
}
function estadoStr(d: DocumentData) { return String(d.estado ?? ""); }

const METODOS = ["M-Pesa", "e-Mola", "Conta bancária", "Outro"];
const PROMO_STATUS_LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Cliente" };

/* ---------- estilos partilhados (mesmas classes do site) ---------- */
const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";
const btnPrimary = "w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const btnGhost = "w-full py-3.5 border border-line text-fg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-accent/50 hover:bg-card/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const cardCls = "border border-line p-6 md:p-8 bg-card/30";
const sectionLbl = "font-mono text-accent text-[10px] uppercase tracking-[0.25em] mb-4 flex items-center gap-2";

/* ===================== ORQUESTRADOR ===================== */
export default function Conta() {
  const cfg = useSiteConfig();

  // sessões: nº de conta (cliente, localStorage) e/ou Google (elo de papéis)
  const [manualConta, setManualConta] = useState<string | null>(() => localStorage.getItem("numeroConta"));
  const [gEmail, setGEmail] = useState<string | null>(null);
  const [gName, setGName] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // dados resolvidos
  const [conta, setConta] = useState<string | null>(manualConta);
  const [dados, setDados] = useState<DocumentData>({});
  const [contaExiste, setContaExiste] = useState(false);
  const [hist, setHist] = useState<{ id: string; d: DocumentData }[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [promo, setPromo] = useState<DocumentData | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [lead, setLead] = useState<DocumentData | null>(null);

  const [toast, setToast] = useState("");
  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  /* sessão Google partilhada (deteta todos os papéis pelo email) */
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setGEmail(u?.email ?? null);
    setGName(u?.displayName ?? null);
    setAuthReady(true);
  }), []);

  /* resolver o nº de conta do cliente: manual OU via portalEmails (Google) */
  useEffect(() => {
    let active = true;
    if (manualConta) { setConta(manualConta); return; }
    if (!gEmail) { setConta(null); return; }
    getDoc(doc(db, "portalEmails", gEmail.toLowerCase()))
      .then((s) => { if (active) setConta(s.exists() ? String(s.data().numeroConta || "") || null : null); })
      .catch(() => { if (active) setConta(null); });
    return () => { active = false; };
  }, [manualConta, gEmail]);

  /* subscrição à conta + histórico de pagamentos */
  useEffect(() => {
    if (!conta) { setDados({}); setContaExiste(false); setHist([]); setHistLoading(false); return; }
    setHistLoading(true);
    const unsubC = onSnapshot(doc(db, "portalContas", conta), (snap) => { setContaExiste(snap.exists()); setDados(snap.data() || {}); }, () => {});
    const q = query(collection(db, "pagamentos"), where("numeroConta", "==", conta), orderBy("data", "desc"));
    const unsubH = onSnapshot(q,
      (snap) => { setHist(snap.docs.map((d) => ({ id: d.id, d: d.data() }))); setHistLoading(false); },
      () => { setHistLoading(false); });
    return () => { unsubC(); unsubH(); };
  }, [conta]);

  /* promotor pelo email Google */
  useEffect(() => {
    let active = true;
    if (!gEmail) { setPromo(null); setCodigo(null); return; }
    (async () => {
      const idx = await getDoc(doc(db, "promotorEmails", gEmail.toLowerCase()));
      const cod = idx.exists() ? String(idx.data().codigo || "") : "";
      if (!cod) { if (active) { setPromo(null); setCodigo(null); } return; }
      const snap = await getDoc(doc(db, "promotores", cod));
      if (active && snap.exists()) { setCodigo(cod); setPromo({ codigo: cod, ...snap.data() }); }
    })().catch(() => {});
    return () => { active = false; };
  }, [gEmail]);

  /* lead (pedido de instalação) pelo email Google — só se ainda não é cliente */
  useEffect(() => {
    let active = true;
    if (!gEmail || contaExiste) { setLead(null); return; }
    (async () => {
      try {
        const q = query(collection(db, "inscricoes"), where("email", "==", gEmail.toLowerCase()), orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);
        if (active) setLead(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
      } catch { if (active) setLead(null); }
    })();
    return () => { active = false; };
  }, [gEmail, contaExiste]);

  const entrarConta = (c: string) => { localStorage.setItem("numeroConta", c); setManualConta(c); };
  const entrarGoogle = async () => { await signInWithPopup(auth, googleProvider); };
  const sair = () => {
    localStorage.removeItem("numeroConta");
    setManualConta(null); setConta(null); setDados({}); setContaExiste(false);
    setHist([]); setPromo(null); setCodigo(null); setLead(null);
    signOut(auth).catch(() => {});
  };

  const hasSession = !!conta || !!gEmail;
  const isCliente = contaExiste;
  const isLead = !!lead && !isCliente;
  const isPromotor = !!promo && !!codigo;
  const nome = String(dados.nome || promo?.nome || gName || "");

  return (
    <Layout>
      <section className="pt-40 pb-24 min-h-screen">
        <div className="max-w-[820px] mx-auto px-6 lg:px-12">
          {!authReady && !manualConta
            ? <p className="text-muted text-sm">A carregar…</p>
            : !hasSession
              ? <Login onEntrarConta={entrarConta} onEntrarGoogle={entrarGoogle} />
              : (
                <>
                  {/* identidade + sair (um só, partilhado) */}
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
                    <div>
                      <div className="font-display text-2xl text-fg">{nome || "A minha conta"}</div>
                      <div className="text-muted text-sm">
                        {isCliente ? <>Conta <span className="font-mono text-fg">{conta}</span></>
                          : isLead ? "Pedido de instalação"
                          : gEmail ? <span className="font-mono text-fg">{gEmail}</span> : "Visitante"}
                      </div>
                    </div>
                    <button onClick={sair} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted hover:text-fg px-3 py-1.5 border border-line transition-colors">
                      <LogOut size={13} /> Sair
                    </button>
                  </div>

                  {/* ===== ÁREA DE CLIENTE ===== */}
                  <div className="mb-14">
                    <div className={sectionLbl}><Wifi size={13} /> A minha Starlink</div>
                    {isCliente
                      ? <ClientePortal conta={conta!} dados={dados} hist={hist} histLoading={histLoading} cfg={cfg} showToast={showToast} />
                      : isLead
                        ? <LeadStatus lead={lead!} />
                        : <CtaCliente />}
                  </div>

                  {/* ===== ÁREA DE PROMOTOR ===== */}
                  <div>
                    <div className={sectionLbl}><Megaphone size={13} /> Promotor</div>
                    {isPromotor
                      ? <PromotorPainel codigo={codigo!} promo={promo!} />
                      : <TeaserPromotor temGoogle={!!gEmail} />}
                  </div>
                </>
              )}
        </div>
      </section>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-7 z-[500] bg-fg text-bg px-6 py-3.5 text-sm font-medium shadow-2xl">
          {toast}
        </div>
      )}
    </Layout>
  );
}

/* ===================== LOGIN ===================== */
function Login({ onEntrarConta, onEntrarGoogle }: { onEntrarConta: (c: string) => void; onEntrarGoogle: () => Promise<void> }) {
  const [conta, setConta] = useState("");
  const [last4, setLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const entrarConta = async () => {
    const c = conta.trim().toUpperCase();
    if (!c) { setErro("Indique o número de conta."); return; }
    setBusy(true); setErro("");
    try {
      const snap = await getDoc(doc(db, "portalContas", c));
      if (!snap.exists()) { setErro("Conta não encontrada. Verifique o número."); return; }
      const reg = String(snap.data().whatsappLast4 ?? "");
      if (reg && last4.trim() !== reg) { setErro("Os 4 dígitos do WhatsApp não conferem."); return; }
      onEntrarConta(c);
    } catch { setErro("Erro ao entrar. Tente de novo."); }
    finally { setBusy(false); }
  };

  const entrarGoogle = async () => {
    setBusy(true); setErro("");
    try { await onEntrarGoogle(); }
    catch { setErro("Login Google indisponível. Use o nº de conta."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-10">
        <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-5 block">Portal Intime</span>
        <h1 className="text-4xl md:text-6xl font-display font-medium text-fg tracking-tighter mb-4">Entrar.</h1>
        <p className="text-lg text-muted font-light border-l border-line pl-6">
          Cliente, promotor ou a pedir instalação — entre aqui. Com o Google reconhecemos automaticamente a sua conta.
        </p>
      </div>

      <div className={cardCls}>
        {/* Google primeiro: é o que liga cliente + promotor + pedidos */}
        <button className={btnPrimary} disabled={busy} onClick={entrarGoogle}>
          <UserIcon size={15} /> {busy ? "A entrar…" : "Entrar com Google"}
        </button>

        <div className="flex items-center gap-4 my-6 text-faint text-xs">
          <span className="flex-1 h-px bg-line" /> ou com nº de conta <span className="flex-1 h-px bg-line" />
        </div>

        <div className="mb-4">
          <label className={lbl}>Número de conta</label>
          <input className={field} placeholder="IN-0000" spellCheck={false} value={conta} onChange={(e) => setConta(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className={lbl}>Últimos 4 dígitos do WhatsApp</label>
          <input className={field} placeholder="0000" inputMode="numeric" maxLength={4} value={last4}
            onChange={(e) => setLast4(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") entrarConta(); }} />
        </div>
        {erro && <p className="text-[#ff6b6b] text-sm mb-3">{erro}</p>}
        <button className={btnGhost} disabled={busy} onClick={entrarConta}>{busy ? "A entrar…" : "Entrar com nº de conta"}</button>

        <p className="text-center text-muted text-sm mt-6">
          Ainda não é cliente? <Link to="/aderir" className="underline hover:text-fg">Pedir instalação</Link>.
        </p>
      </div>
    </>
  );
}

/* ===================== CLIENTE: PORTAL ===================== */
function ClientePortal({ conta, dados, hist, histLoading, cfg, showToast }: {
  conta: string; dados: DocumentData; hist: { id: string; d: DocumentData }[];
  histLoading: boolean; cfg: ReturnType<typeof useSiteConfig>; showToast: (m: string) => void;
}) {
  const [tab, setTab] = useState<"conta" | "pagar">("conta");
  const estado = String(dados.estado ?? "—");
  const pillCls = emAtraso(estado) ? "text-[#ff6b6b] border-[#ff6b6b]/40 bg-[#ff6b6b]/10"
    : estadoOk(estado) ? "text-accent border-accent/40 bg-accent/10"
    : "text-muted border-line bg-card/40";

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <span className={`text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border ${pillCls}`}>{estado}</span>
      </div>

      <div className="flex gap-2 mb-8 border-b border-line">
        {([["conta", "Subscrição"], ["pagar", "Pagamentos"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-3 text-[11px] font-mono uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors ${tab === k ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "conta"
        ? <TabConta conta={conta} dados={dados} cfg={cfg} showToast={showToast} />
        : <TabPagar conta={conta} dados={dados} hist={hist} histLoading={histLoading} cfg={cfg} showToast={showToast} />}
    </>
  );
}

/* ---------- TAB: SUBSCRIÇÃO ---------- */
function TabConta({ conta, dados, cfg, showToast }: {
  conta: string; dados: DocumentData; cfg: ReturnType<typeof useSiteConfig>; showToast: (m: string) => void;
}) {
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState("");
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWa(String(dados.contactoWhatsapp ?? dados.whatsapp ?? ""));
    setEmail(String(dados.contactoEmail ?? dados.email ?? ""));
    setAlt(String(dados.contactoAlternativo ?? ""));
  }, [dados]);

  const prox = proximaData(dados, new Date());
  const rows: [string, string][] = [
    ["Titular", String(dados.nome ?? "—")],
    ["Conta", conta],
    ["Pacote", String(dados.pacote ?? "—")],
    ["Mensalidade", dados.mensalidade ? `${dados.mensalidade} MT` : "—"],
    ["Dia de pagamento", dados.diaPagamento ? `Dia ${String(dados.diaPagamento).replace(/[^0-9]/g, "")}` : "—"],
    ["Próximo pagamento", prox ? dataExtenso(prox) : "—"],
  ];

  const guardar = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "portalContas", conta), {
        contactoWhatsapp: wa.trim(), contactoEmail: email.trim(), contactoAlternativo: alt.trim(),
        contactoAtualizadoEm: serverTimestamp(),
      }, { merge: true });
      showToast("Contacto atualizado.");
    } catch { showToast("Não foi possível guardar. Tente de novo."); }
    finally { setSaving(false); }
  };

  const abrirPedido = async (tipo: string, descricao: string) => {
    try {
      await addDoc(collection(db, "suporte"), { numeroConta: conta, tipo, descricao, estado: "Recebido", createdAt: serverTimestamp() });
      showToast(`Pedido enviado: ${tipo}. A equipa vai contactá-lo.`);
    } catch { showToast("Não foi possível enviar. Tente de novo."); }
  };

  const pedirMudanca = () => {
    const opts = (cfg.plans || []).map((p) => p.name).filter(Boolean);
    const lista = opts.length ? "\n• " + opts.join("\n• ") : "";
    const destino = window.prompt(`Pedir mudança de pacote\nPacote atual: ${dados.pacote || "—"}${lista}\n\nEscreva o pacote desejado:`);
    if (destino && destino.trim()) abrirPedido("Quero mudar de pacote", `Pacote atual: ${dados.pacote || "—"}. Pacote desejado: ${destino.trim()}.`);
  };
  const pedirCancelamento = () => {
    if (window.confirm("Vamos abrir um pedido para a equipa o contactar, explicar valores pendentes e combinar a devolução dos equipamentos. A conta NÃO é cancelada automaticamente.\n\nConfirmar pedido de cancelamento?"))
      abrirPedido("Quero cancelar", `Pacote atual: ${dados.pacote || "—"}.`);
  };

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-5">Detalhes da subscrição</h3>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3 border-b border-line/60 last:border-0">
            <span className="text-muted text-sm">{k}</span>
            <span className="text-fg font-medium text-right">{v}</span>
          </div>
        ))}
        <p className="text-faint text-xs mt-4">Estes dados são geridos pela Intime. Para os alterar, fale com a equipa.</p>
      </div>

      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-5">Atualizar contacto</h3>
        <div className="mb-4"><label className={lbl}>Número de WhatsApp</label><input className={field} value={wa} onChange={(e) => setWa(e.target.value)} /></div>
        <div className="mb-4"><label className={lbl}>Email (opcional)</label><input className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="mb-5"><label className={lbl}>Contacto alternativo (opcional)</label><input className={field} value={alt} onChange={(e) => setAlt(e.target.value)} /></div>
        <button className={btnPrimary} disabled={saving} onClick={guardar}>{saving ? "A guardar…" : "Guardar contacto"}</button>
      </div>

      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-5">Pedidos</h3>
        <div className="space-y-3">
          <button className={btnGhost} onClick={pedirMudanca}><RefreshCcw size={15} /> Pedir mudança de pacote</button>
          <button className={btnGhost + " !text-[#ff6b6b] hover:!border-[#ff6b6b]/50"} onClick={pedirCancelamento}><Ban size={15} /> Pedir cancelamento</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- TAB: PAGAMENTOS ---------- */
function TabPagar({ conta, dados, hist, histLoading, cfg, showToast }: {
  conta: string; dados: DocumentData; hist: { id: string; d: DocumentData }[];
  histLoading: boolean; cfg: ReturnType<typeof useSiteConfig>; showToast: (m: string) => void;
}) {
  const [metodo, setMetodo] = useState("M-Pesa");
  const [codigo, setCodigo] = useState("");
  const [busy, setBusy] = useState(false);
  const mobileMoney = metodo === "M-Pesa" || metodo === "e-Mola";
  const numeroMM = (cfg.contacts.whatsapp && cfg.contacts.whatsapp.length) ? cfg.contacts.whatsapp : cfg.contacts.phone;
  const atraso = emAtraso(estadoStr(dados));

  const registar = async (valor: number, extra: Record<string, unknown>) => {
    let estado = "Pendente";
    const cod = String(extra.codigo || "");
    if (cod) {
      try {
        const t = await getDoc(doc(db, "transacoesMpesa", cod));
        if (t.exists()) {
          const v = typeof t.data().valor === "number" ? (t.data().valor as number) : 0;
          if (valor === 0 || v + 0.01 >= valor) estado = "Aprovado";
        }
      } catch { /* ignora */ }
    }
    await addDoc(collection(db, "pagamentos"), {
      clienteId: dados.clienteId || "", numeroConta: conta, clienteNome: dados.nome || "",
      mes: monthKey(), valor, metodo, estado, viaPortal: true,
      ...(dados.promotor ? { promotor: dados.promotor } : {}),
      data: serverTimestamp(), ...extra,
    });
  };

  const submeterCodigo = async () => {
    const c = codigo.trim().toUpperCase();
    if (c.length < 6) { showToast("Insira o código da transação."); return; }
    setBusy(true);
    try { await registar(mtValue(dados.mensalidade), { codigo: c }); setCodigo(""); showToast("Recebemos o seu código. A equipa vai confirmar em breve."); }
    catch { showToast("Erro ao submeter. Tente de novo."); }
    finally { setBusy(false); }
  };

  const enviarComprovativo = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = sRef(storage, `comprovativos/${conta}/${Date.now()}.jpg`);
      await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(r);
      await registar(mtValue(dados.mensalidade), { comprovativoUrl: url, codigo: codigo.trim().toUpperCase() });
      setCodigo("");
      showToast("Pagamento enviado. A aguardar confirmação da Intime.");
    } catch { showToast("Não foi possível enviar o comprovativo. Tente de novo ou fale com a equipa."); }
    finally { setBusy(false); }
  };

  const wa = (numeroMM || "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent(`Olá, sou o cliente ${conta}. Tenho uma dúvida sobre pagamento.`)}`;

  return (
    <div className="space-y-6">
      <div className={cardCls + " bg-card/50"}>
        <div className="text-faint text-[11px] font-mono uppercase tracking-widest">Valor a pagar este mês</div>
        <div className="font-display text-5xl text-fg mt-1">{dados.mensalidade ?? "—"} <span className="text-xl text-muted">MT</span></div>
        {atraso && <p className="text-[#ff6b6b] text-sm mt-3">⚠ Conta em atraso — regularize assim que possível.</p>}
      </div>

      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-4">Como pagar</h3>
        <div className="flex flex-wrap gap-2 mb-5">
          {METODOS.map((m) => (
            <button key={m} onClick={() => setMetodo(m)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-colors ${m === metodo ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg hover:border-accent/50"}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="border border-dashed border-line p-5 mb-5 text-sm leading-relaxed">
          {mobileMoney ? (
            <>
              <b>{metodo}</b> — envie <b>{dados.mensalidade || ""} MT</b> para:
              <div className="font-display text-2xl text-fg mt-1">{numeroMM || "(número definido pela Intime)"}</div>
            </>
          ) : (
            "Peça os dados desta forma de pagamento à equipa pelo WhatsApp e, depois de pagar, envie aqui a foto do comprovativo."
          )}
        </div>

        {mobileMoney && (
          <div className="mb-3">
            <label className={lbl}>Código da transação <span className="normal-case tracking-normal text-faint">(opcional se enviar foto)</span></label>
            <input className={field + " mb-3"} placeholder="Ex.: CI8R4T2X9P" spellCheck={false} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <button className={btnPrimary} disabled={busy} onClick={submeterCodigo}>{busy ? "A submeter…" : "Já paguei — confirmar"}</button>
          </div>
        )}

        <label className={btnGhost + " cursor-pointer mt-1"}>
          <Upload size={15} /> Enviar foto do comprovativo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => enviarComprovativo(e.target.files?.[0])} />
        </label>

        <p className="text-center text-muted text-sm mt-5">
          Dúvidas sobre o pagamento? <a href={waUrl} target="_blank" rel="noopener" className="underline hover:text-fg">Falar com a equipa no WhatsApp</a>
        </p>
      </div>

      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-4">Histórico de pagamentos</h3>
        {histLoading ? (
          <p className="text-muted text-sm">A carregar…</p>
        ) : hist.length === 0 ? (
          <p className="text-muted text-sm">Ainda não há pagamentos registados.</p>
        ) : (
          <div>
            {hist.map(({ id, d }) => {
              const estado = String(d.estado || "Pendente");
              const e = estado.toLowerCase();
              const aprovado = e.includes("aprov") || e.includes("pago");
              const recusado = e.includes("recus");
              const color = recusado ? "#ff6b6b" : aprovado ? "var(--accent,#5CF2C8)" : "#f5b948";
              const Icon = recusado ? XIcon : aprovado ? Check : Clock;
              const valor = d.valor != null ? `${Math.round(Number(d.valor) || 0)} MT` : "—";
              return (
                <div key={id} className="flex items-center gap-4 py-3.5 border-b border-line/60 last:border-0">
                  <div className="w-9 h-9 grid place-items-center border border-line shrink-0" style={{ color }}><Icon size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-fg font-medium">{valor}</div>
                    <div className="text-faint text-xs">{`${d.mes || ""} · ${d.metodo || ""}${d.comprovativoUrl ? " · com foto" : ""}`}</div>
                    <div className="text-faint text-xs">{fmtTs(d.data)}</div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border" style={{ color, borderColor: color }}>{estado}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== LEAD: ESTADO DO PEDIDO ===================== */
function LeadStatus({ lead }: { lead: DocumentData }) {
  const status = String(lead.status || "novo");
  const order: Record<string, number> = { novo: 0, contactado: 1, concluido: 2 };
  const cur = order[status] ?? 0;
  const passos = [
    { label: "Pedido recebido", desc: "Recebemos o seu pedido de instalação." },
    { label: "Em avaliação", desc: "A equipa entra em contacto para confirmar e agendar." },
    { label: "Instalação concluída", desc: "A sua Starlink fica ativa e a conta abre aqui." },
  ];

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
          <h3 className="font-display text-xl text-fg">O seu pedido de instalação</h3>
          <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-accent/40 text-accent bg-accent/10">Em curso</span>
        </div>
        <p className="text-muted text-sm mb-6">{[lead.plano, lead.cidade].filter(Boolean).join(" · ") || "—"}{lead.createdAt ? ` · ${fmtData(lead.createdAt)}` : ""}</p>

        <div className="space-y-5">
          {passos.map((p, i) => {
            const feito = i <= cur;
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 grid place-items-center rounded-full border ${feito ? "bg-accent text-bg border-accent" : "border-line text-faint"}`}>
                    {feito ? <Check size={14} /> : <span className="text-[11px] font-mono">{i + 1}</span>}
                  </div>
                  {i < passos.length - 1 && <div className={`w-px flex-1 my-1 ${i < cur ? "bg-accent" : "bg-line"}`} style={{ minHeight: 22 }} />}
                </div>
                <div className="pb-1">
                  <div className={`font-medium ${feito ? "text-fg" : "text-muted"}`}>{p.label}</div>
                  <div className="text-faint text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-faint text-xs text-center">Assim que a Starlink for instalada, esta área passa a mostrar a sua conta, pagamentos e faturas.</p>
    </div>
  );
}

/* ===================== CTA: TORNAR-SE CLIENTE ===================== */
function CtaCliente() {
  return (
    <div className={cardCls + " text-center"}>
      <Wifi size={26} className="mx-auto mb-4 text-accent" />
      <h3 className="font-display text-2xl text-fg mb-2">Ainda não tem Starlink connosco?</h3>
      <p className="text-muted text-sm mb-6 max-w-md mx-auto">Peça a instalação e acompanhe aqui o estado do seu pedido até ficar online.</p>
      <Link to="/aderir" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors">
        Pedir instalação <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/* ===================== PROMOTOR: PAINEL ===================== */
function PromotorPainel({ codigo, promo }: { codigo: string; promo: DocumentData }) {
  const [copied, setCopied] = useState(false);
  const pct = Number(promo.percentagem) || 8;
  const stats = promo.stats || {};
  const leads: DocumentData[] = Array.isArray(promo.leadsResumo) ? promo.leadsResumo : [];
  const clientes: DocumentData[] = Array.isArray(promo.clientesResumo) ? promo.clientesResumo : [];
  const nLeads = Number(stats.leads ?? leads.length) || 0;
  const nClientes = Number(stats.clientes ?? clientes.length) || 0;
  const comissao = Number(stats.comissao) || 0;
  const semDados = !promo.statsAtualizadoEm && leads.length === 0;

  const link = `${window.location.origin}/p/${codigo}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  };

  return (
    <>
      <div className="mb-6 text-muted text-sm">Código <span className="font-mono text-fg">{codigo}</span> · {pct}% por pagamento</div>

      <div className={cardCls + " mb-6"}>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-faint mb-3"><Link2 size={14} /> O meu link</div>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 min-w-0 break-all text-fg text-sm">{link}</code>
          <button onClick={copy} className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors">
            {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
          </button>
        </div>
        <p className="text-faint text-xs mt-3">Partilhe este link. Quem aderir por ele fica associado a si.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users, n: nLeads, l: "Leads" },
          { icon: UserCheck, n: nClientes, l: "Clientes" },
          { icon: Wallet, n: `${comissao} MT`, l: "Comissão", accent: true },
        ].map((s, i) => (
          <div key={i} className={cardCls + " text-center"}>
            <s.icon size={18} className="mx-auto mb-2 text-faint" />
            <div className={`font-display text-3xl ${s.accent ? "text-accent" : "text-fg"}`}>{s.n}</div>
            <div className="text-[10px] font-mono uppercase text-faint mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {semDados && (
        <div className={cardCls + " mb-6"}>
          <p className="text-muted text-sm">Ainda não há resultados. Partilhe o seu link — assim que alguém aderir por ele, aparece aqui.</p>
        </div>
      )}

      <div className={cardCls + " mb-6"}>
        <h3 className="font-display text-xl text-fg mb-4">Os meus clientes</h3>
        {clientes.length === 0
          ? <p className="text-muted text-sm">Ainda não há clientes confirmados. Assim que um lead seu virar cliente, aparece aqui.</p>
          : <div>{clientes.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-line/60 last:border-0">
                <div><div className="text-fg font-medium">{c.nome || "—"}</div><div className="text-faint text-xs">{c.pacote || "—"}</div></div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-muted">{c.estado || "—"}</span>
              </div>
            ))}</div>}
      </div>

      <div className={cardCls}>
        <h3 className="font-display text-xl text-fg mb-4">Pedidos que trouxe</h3>
        {leads.length === 0
          ? <p className="text-muted text-sm">Ainda sem pedidos. Partilhe o seu link para começar.</p>
          : <div>{leads.map((l, i) => {
              const st = String(l.status || "novo");
              return (
                <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-line/60 last:border-0">
                  <div>
                    <div className="text-fg font-medium">{l.nome || "—"}</div>
                    <div className="text-faint text-xs">{[l.plano, l.cidade].filter(Boolean).join(" · ") || "—"} · {fmtData(l.data)}</div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-muted">{PROMO_STATUS_LABEL[st] || st}</span>
                </div>
              );
            })}</div>}
      </div>
    </>
  );
}

/* ===================== PROMOTOR: CONVITE (não é promotor) ===================== */
function TeaserPromotor({ temGoogle }: { temGoogle: boolean }) {
  return (
    <div className={cardCls}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 grid place-items-center border border-line text-accent shrink-0"><Wallet size={18} /></div>
        <div>
          <h3 className="font-display text-xl text-fg mb-1">Ganhe comissões com a Intime</h3>
          <p className="text-muted text-sm mb-4">
            Como promotor, ganha uma percentagem por cada pagamento dos clientes que trouxer — de forma recorrente. Ser promotor é por convite da equipa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contacto" className="inline-flex items-center gap-2 px-5 py-3 border border-line text-fg font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors">
              <MessageCircle size={14} /> Quero ser promotor
            </Link>
            {!temGoogle && <span className="text-faint text-xs self-center">Já é promotor? Entre com Google.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
