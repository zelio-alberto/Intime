import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { db, auth, googleProvider, storage } from "../firebase";
import {
  doc, getDoc, setDoc, addDoc, collection, onSnapshot,
  query, where, orderBy, serverTimestamp, Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInWithPopup } from "firebase/auth";
import { useSiteConfig } from "../useSiteConfig";
import {
  LogOut, Upload, MessageCircle, Check, Clock, X as XIcon,
  RefreshCcw, Ban, User as UserIcon,
} from "lucide-react";

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

const METODOS = ["M-Pesa", "e-Mola", "Conta bancária", "Outro"];

/* ---------- estilos partilhados (mesmas classes do site) ---------- */
const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";
const btnPrimary = "w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50";
const btnGhost = "w-full py-3.5 border border-line text-fg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-accent/50 hover:bg-card/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const cardCls = "border border-line p-6 md:p-8 bg-card/30";

export default function Conta() {
  const cfg = useSiteConfig();
  const [conta, setConta] = useState<string | null>(() => localStorage.getItem("numeroConta"));
  const [dados, setDados] = useState<DocumentData>({});
  const [hist, setHist] = useState<{ id: string; d: DocumentData }[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  /* --- subscrições à conta + histórico --- */
  useEffect(() => {
    if (!conta) return;
    const unsubC = onSnapshot(doc(db, "portalContas", conta), (snap) => setDados(snap.data() || {}), () => {});
    const q = query(collection(db, "pagamentos"), where("numeroConta", "==", conta), orderBy("data", "desc"));
    const unsubH = onSnapshot(q,
      (snap) => { setHist(snap.docs.map((d) => ({ id: d.id, d: d.data() }))); setHistLoading(false); },
      () => { setHistLoading(false); }
    );
    return () => { unsubC(); unsubH(); };
  }, [conta]);

  const entrar = (c: string) => { localStorage.setItem("numeroConta", c); setConta(c); };
  const sair = () => { localStorage.removeItem("numeroConta"); setConta(null); setDados({}); setHist([]); };

  return (
    <Layout>
      <section className="pt-40 pb-24 min-h-screen">
        <div className="max-w-[760px] mx-auto px-6 lg:px-12">
          {conta
            ? <Portal conta={conta} dados={dados} hist={hist} histLoading={histLoading} cfg={cfg} onLogout={sair} showToast={showToast} />
            : <Login onLogin={entrar} />}
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
function Login({ onLogin }: { onLogin: (c: string) => void }) {
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
      onLogin(c);
    } catch { setErro("Erro ao entrar. Tente de novo."); }
    finally { setBusy(false); }
  };

  const entrarGoogle = async () => {
    setBusy(true); setErro("");
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const email = (res.user.email || "").toLowerCase();
      const idx = await getDoc(doc(db, "portalEmails", email));
      const c = String(idx.exists() ? (idx.data().numeroConta ?? "") : "");
      if (!c) { setErro("Nenhuma conta Intime para este email. Use o nº de conta."); return; }
      onLogin(c);
    } catch { setErro("Login Google indisponível. Use o nº de conta."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-10">
        <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-5 block">Portal do cliente</span>
        <h1 className="text-4xl md:text-6xl font-display font-medium text-fg tracking-tighter mb-4">A minha conta.</h1>
        <p className="text-lg text-muted font-light border-l border-line pl-6">
          Aceda com o número de conta que recebeu da Intime para ver os detalhes e pagar a sua mensalidade.
        </p>
      </div>

      <div className={cardCls}>
        <div className="mb-5">
          <label className={lbl}>Número de conta</label>
          <input className={field} placeholder="IN-0000" spellCheck={false} value={conta}
            onChange={(e) => setConta(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className={lbl}>Últimos 4 dígitos do WhatsApp</label>
          <input className={field} placeholder="0000" inputMode="numeric" maxLength={4} value={last4}
            onChange={(e) => setLast4(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") entrarConta(); }} />
        </div>
        {erro && <p className="text-[#ff6b6b] text-sm mb-3">{erro}</p>}
        <button className={btnPrimary} disabled={busy} onClick={entrarConta}>
          {busy ? "A entrar…" : "Entrar"}
        </button>

        <div className="flex items-center gap-4 my-6 text-faint text-xs">
          <span className="flex-1 h-px bg-line" /> ou <span className="flex-1 h-px bg-line" />
        </div>
        <button className={btnGhost} disabled={busy} onClick={entrarGoogle}>
          <UserIcon size={15} /> Entrar com Google
        </button>
        <p className="text-center text-muted text-sm mt-6">
          Não sabe o número da conta? <a href="/contacto" className="underline hover:text-fg">Fale com a equipa</a>.
        </p>
      </div>
    </>
  );
}

/* ===================== PORTAL ===================== */
function Portal({ conta, dados, hist, histLoading, cfg, onLogout, showToast }: {
  conta: string; dados: DocumentData; hist: { id: string; d: DocumentData }[];
  histLoading: boolean; cfg: ReturnType<typeof useSiteConfig>;
  onLogout: () => void; showToast: (m: string) => void;
}) {
  const [tab, setTab] = useState<"conta" | "pagar">("conta");
  const estado = String(dados.estado ?? "—");
  const pillCls = emAtraso(estado) ? "text-[#ff6b6b] border-[#ff6b6b]/40 bg-[#ff6b6b]/10"
    : estadoOk(estado) ? "text-accent border-accent/40 bg-accent/10"
    : "text-muted border-line bg-card/40";

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="font-display text-2xl text-fg">{dados.nome || "Cliente Intime"}</div>
          <div className="text-muted text-sm">Conta <span className="font-mono text-fg">{conta}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border ${pillCls}`}>{estado}</span>
          <button onClick={onLogout} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted hover:text-fg px-3 py-1.5 border border-line transition-colors">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-2 mb-8 border-b border-line">
        {([["conta", "Minha conta"], ["pagar", "Pagamentos"]] as const).map(([k, label]) => (
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

/* ---------- TAB: MINHA CONTA ---------- */
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
      {/* valor */}
      <div className={cardCls + " bg-card/50"}>
        <div className="text-faint text-[11px] font-mono uppercase tracking-widest">Valor a pagar este mês</div>
        <div className="font-display text-5xl text-fg mt-1">{dados.mensalidade ?? "—"} <span className="text-xl text-muted">MT</span></div>
        {atraso && <p className="text-[#ff6b6b] text-sm mt-3">⚠ Conta em atraso — regularize assim que possível.</p>}
      </div>

      {/* como pagar */}
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

      {/* histórico */}
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

function estadoStr(d: DocumentData) { return String(d.estado ?? ""); }
