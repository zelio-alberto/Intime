import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { db, auth, googleProvider } from "../firebase";
import {
  doc, getDoc, getDocs, setDoc, addDoc, collection, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { useSiteConfig } from "../useSiteConfig";
import {
  LogOut, Upload, Check, Clock, X as XIcon, RefreshCcw, Ban, Copy, Link2,
  Users, UserCheck, Wallet, Wifi, Megaphone, ArrowRight, TrendingUp, ExternalLink,
  Home, Receipt, Mail, Settings, CheckCircle2, Plus, FileText,
} from "lucide-react";

/* ===========================================================================
   PORTAL "A MINHA CONTA" — estilo painel (barra lateral + secções), inspirado
   no portal de cliente da Starlink. Junta, de forma adaptativa pelos papéis:
     • Cliente   (portalContas)   — Início · Subscrição · Pagamentos · Suporte · Definições
     • Promotor  (promotores)     — secção Promotor
     • Lead      (inscricoes)     — secção Pedido
   O email Google é o elo que liga os papéis. O admin (/admin) NÃO entra aqui.
   =========================================================================== */

/* ---------- helpers ---------- */
const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function mtValue(v: unknown): number {
  if (typeof v === "number") return v;
  const d = String(v ?? "").replace(/[^0-9]/g, "");
  return d ? parseFloat(d) : 0;
}
function emAtraso(e?: string) { const x = (e || "").toLowerCase(); return x.includes("atraso") || x.includes("suspens") || x.includes("dívida") || x.includes("divida"); }
function estadoOk(e?: string) { const x = (e || "").toLowerCase(); return x.includes("activ") || x.includes("ativ") || x.includes("em dia") || x.includes("regular"); }
// Mensalidade a cada 30 dias: a partir do último pagamento aprovado; se ainda
// não houver, a partir da ativação/criação da conta.
function proximaData(d: DocumentData, hist: { id: string; d: DocumentData }[]): Date | null {
  const aprov = (hist || []).find((h) => { const e = String(h.d.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); });
  let base: Date | null = null;
  if (aprov && aprov.d.data instanceof Timestamp) base = aprov.d.data.toDate();
  else if (d.ativadoEm instanceof Timestamp) base = d.ativadoEm.toDate();
  else if (d.createdAt instanceof Timestamp) base = d.createdAt.toDate();
  else if (d.dueDate instanceof Timestamp) return d.dueDate.toDate();
  if (!base) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + 30);
  return next;
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

// Abre uma fatura Intime (HTML branded) numa janela nova, pronta a imprimir / guardar como PDF.
function abrirFatura(p: DocumentData, dados: DocumentData, contacts: { email: string; whatsapp: string; phone: string }) {
  const w = window.open("", "_blank");
  if (!w) return;
  const valor = Math.round(Number(p.valor) || 0);
  const dataPag = p.data instanceof Timestamp ? p.data.toDate() : new Date();
  const fim = new Date(dataPag); fim.setDate(fim.getDate() + 30);
  const fmtD = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  const fVal = (n: number) => n.toLocaleString("pt-PT");
  const conta = String(dados.numeroConta || "");
  const invNo = `INV-${conta}-${p.mes || monthKey()}`.toUpperCase();
  const pacote = String(dados.pacote || "Serviço de internet Intime");
  const nome = String(dados.nome || "");
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  const tel = String(dados.contactoWhatsapp || dados.whatsapp || "");
  const logo = `${window.location.origin}/logo-intime.png`;
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${invNo}</title><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0 auto;padding:36px;max-width:800px;font-size:13px;line-height:1.55}
    .head{display:flex;justify-content:space-between;align-items:flex-start;background:#f4f5f6;padding:26px;border-radius:10px}
    .brand{display:flex;align-items:center;gap:10px} .brand img{width:36px;height:36px;object-fit:contain} .brand b{font-size:21px;letter-spacing:3px}
    .rt{text-align:right} .rt h1{margin:0;font-size:26px} .rt .no{font-weight:bold;margin-top:6px} .rt .meta{color:#555;font-size:12px;margin-top:6px}
    .to{padding:20px 4px;color:#333} table{width:100%;border-collapse:collapse} th{text-align:left;border-bottom:1px solid #ccc;padding:10px 4px;font-size:12px} td{padding:9px 4px} .r{text-align:right}
    .tot td{border-top:1px solid #ccc;font-weight:bold} .due{font-size:20px;font-weight:bold;border-top:2px solid #111;padding-top:14px;display:flex;justify-content:space-between;margin-top:10px}
    .note{color:#555;font-size:12px;margin-top:24px} .foot{text-align:center;color:#666;font-size:11.5px;margin-top:44px;border-top:1px solid #eee;padding-top:16px}
    @media print{body{padding:14px}}</style></head><body>
    <div class="head"><div class="brand"><img src="${logo}" alt="Intime"/><b>INTIME</b></div>
      <div class="rt"><h1>Fatura</h1><div class="no">${invNo}</div><div class="meta">Data: ${fmtD(dataPag)}<br>Conta: ${conta}</div></div></div>
    <div class="to"><b>${nome}</b>${local ? `<br>${local}` : ""}${tel ? `<br>${tel}` : ""}</div>
    <table>
      <tr><th>Descrição</th><th class="r">Qt</th><th class="r">Valor</th></tr>
      <tr><td>${pacote}<br><span style="color:#777;font-size:11.5px">Período: ${fmtD(dataPag)} – ${fmtD(fim)}</span></td><td class="r">1</td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr class="tot"><td>Custo total</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr><td>Pagamento (${p.metodo || ""}${p.codigo ? " · " + p.codigo : ""})</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
    </table>
    <div class="due"><span>Total devido</span><span>MZN 0</span></div>
    <p class="note">Mensalidade referente a 30 dias de serviço de internet Intime. Em caso de dúvida sobre esta fatura, contacte a equipa Intime${contacts.phone ? ` (${contacts.phone})` : ""}.</p>
    <div class="foot">Intime — Internet Starlink em Moçambique${contacts.email ? ` · ${contacts.email}` : ""}${contacts.phone ? ` · ${contacts.phone}` : ""}<br>Documento processado por computador.</div>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { /* */ } }, 400);
}

// Fatura PROVISÓRIA do próximo período (ainda por pagar).
function abrirProximaFatura(dados: DocumentData, prox: Date, contacts: { email: string; whatsapp: string; phone: string }) {
  const w = window.open("", "_blank");
  if (!w) return;
  // se houver mudança de pacote agendada, a próxima fatura já vem com o novo valor
  const valor = Math.round(mtValue(dados.mensalidadePendente || dados.mensalidade));
  const fim = new Date(prox); fim.setDate(fim.getDate() + 30);
  const fmtD = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  const fVal = (n: number) => n.toLocaleString("pt-PT");
  const conta = String(dados.numeroConta || "");
  const invNo = `INV-${conta}-${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-PREV`.toUpperCase();
  const pacote = String(dados.pacotePendente || dados.pacote || "Serviço de internet Intime");
  const nome = String(dados.nome || "");
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  const logo = `${window.location.origin}/logo-intime.png`;
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${invNo}</title><style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0 auto;padding:36px;max-width:800px;font-size:13px;line-height:1.55}
    .head{display:flex;justify-content:space-between;align-items:flex-start;background:#f4f5f6;padding:26px;border-radius:10px}
    .brand{display:flex;align-items:center;gap:10px} .brand img{width:36px;height:36px;object-fit:contain} .brand b{font-size:21px;letter-spacing:3px}
    .rt{text-align:right} .rt h1{margin:0;font-size:24px} .rt .tag{display:inline-block;background:#e9edf0;color:#555;font-size:10px;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-top:6px}
    .rt .no{font-weight:bold;margin-top:8px} .rt .meta{color:#555;font-size:12px;margin-top:6px}
    .to{padding:20px 4px;color:#333} table{width:100%;border-collapse:collapse} th{text-align:left;border-bottom:1px solid #ccc;padding:10px 4px;font-size:12px} td{padding:9px 4px} .r{text-align:right}
    .tot td{border-top:1px solid #ccc;font-weight:bold} .due{font-size:20px;font-weight:bold;border-top:2px solid #111;padding-top:14px;display:flex;justify-content:space-between;margin-top:10px}
    .note{color:#555;font-size:12px;margin-top:24px} .foot{text-align:center;color:#666;font-size:11.5px;margin-top:44px;border-top:1px solid #eee;padding-top:16px}
    @media print{body{padding:14px}}</style></head><body>
    <div class="head"><div class="brand"><img src="${logo}" alt="Intime"/><b>INTIME</b></div>
      <div class="rt"><h1>Próxima fatura</h1><div class="tag">PROVISÓRIA</div><div class="no">${invNo}</div><div class="meta">Vencimento: ${fmtD(prox)}<br>Conta: ${conta}</div></div></div>
    <div class="to"><b>${nome}</b>${local ? `<br>${local}` : ""}</div>
    <table>
      <tr><th>Descrição</th><th class="r">Qt</th><th class="r">Valor</th></tr>
      <tr><td>${pacote}<br><span style="color:#777;font-size:11.5px">Período: ${fmtD(prox)} – ${fmtD(fim)}</span></td><td class="r">1</td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr class="tot"><td>Custo total</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
    </table>
    <div class="due"><span>Total a pagar</span><span>MZN ${fVal(valor)}</span></div>
    <p class="note">Fatura provisória do próximo período de 30 dias. O valor pode mudar caso altere o pacote. Pague até ${fmtD(prox)} para manter o serviço ativo.${contacts.phone ? ` Dúvidas: ${contacts.phone}.` : ""}</p>
    <div class="foot">Intime — Internet Starlink em Moçambique${contacts.email ? ` · ${contacts.email}` : ""}${contacts.phone ? ` · ${contacts.phone}` : ""}<br>Documento processado por computador.</div>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { /* */ } }, 400);
}
// Upload direto do browser para o Cloudinary (preset unsigned — sem segredos).
async function uploadCloudinary(file: File, cloudName: string, preset: string, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  if (folder) form.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary " + res.status);
  const data = await res.json();
  const url = data.secure_url || data.url;
  if (!url) throw new Error("sem url");
  return String(url);
}
function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "IN";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}
function localStr(d: DocumentData) {
  return [d.bairro, d.cidade].filter(Boolean).join(", ") || String(d.endereco || d.localidade || d.morada || "—");
}
function pillEstado(estado: string) {
  return emAtraso(estado) ? "text-[#ff6b6b] border-[#ff6b6b]/40 bg-[#ff6b6b]/10"
    : estadoOk(estado) ? "text-accent border-accent/40 bg-accent/10"
    : "text-muted border-line bg-card/40";
}

// Janela de "em processamento": há pagamento aprovado recente mas a conta ainda
// está em atraso (a aguardar recarregamento da Starlink). Devolve o instante-alvo
// estimado do recarregamento (ou null se não aplicável).
const RECARGA_MIN = 30;
function processamentoTarget(dados: DocumentData, hist: { id: string; d: DocumentData }[]): number | null {
  if (!emAtraso(estadoStr(dados))) return null;
  const aprov = hist.find((h) => { const e = String(h.d.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); });
  const ts = aprov?.d.data instanceof Timestamp ? aprov.d.data.toMillis() : 0;
  if (!ts || (Date.now() - ts) > 1000 * 60 * 60 * 48) return null;
  return ts + 1000 * 60 * RECARGA_MIN;
}

const PROMO_STATUS_LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Cliente" };
const TIPOS_SUPORTE = ["Falha de internet", "Internet lenta", "Problema no pagamento", "Mudança de morada", "Equipamento", "Outro assunto"];

/* ---------- estilos partilhados ---------- */
const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";
const btnPrimary = "w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const btnGhost = "w-full py-3.5 border border-line text-fg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-accent/50 hover:bg-card/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const panel = "border border-line bg-card";
const panelPad = panel + " p-6 md:p-8";

/* ===================== ORQUESTRADOR ===================== */
export default function Conta() {
  const cfg = useSiteConfig();

  const [gEmail, setGEmail] = useState<string | null>(null);
  const [gName, setGName] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [conta, setConta] = useState<string | null>(null);
  const [dados, setDados] = useState<DocumentData>({});
  const [contaExiste, setContaExiste] = useState(false);
  const [hist, setHist] = useState<{ id: string; d: DocumentData }[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [promo, setPromo] = useState<DocumentData | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [lead, setLead] = useState<DocumentData | null>(null);
  const [secao, setSecao] = useState("");

  const [toast, setToast] = useState("");
  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setGEmail(u?.email ?? null);
    setGName(u?.displayName ?? null);
    setAuthReady(true);
  }), []);

  // a conta do cliente resolve-se sempre pelo email Google (web = só Google)
  useEffect(() => {
    let active = true;
    if (!gEmail) { setConta(null); return; }
    getDoc(doc(db, "portalEmails", gEmail.toLowerCase()))
      .then((s) => { if (active) setConta(s.exists() ? String(s.data().numeroConta || "") || null : null); })
      .catch(() => { if (active) setConta(null); });
    return () => { active = false; };
  }, [gEmail]);

  useEffect(() => {
    if (!conta) { setDados({}); setContaExiste(false); setHist([]); setHistLoading(false); return; }
    setHistLoading(true);
    const unsubC = onSnapshot(doc(db, "portalContas", conta), (snap) => { setContaExiste(snap.exists()); setDados(snap.data() || {}); }, () => {});
    // sem orderBy → não exige índice composto; ordena no cliente por data desc.
    const q = query(collection(db, "pagamentos"), where("numeroConta", "==", conta));
    const unsubH = onSnapshot(q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, d: d.data() }));
        arr.sort((a, b) => ((b.d.data?.seconds || 0) - (a.d.data?.seconds || 0)));
        setHist(arr); setHistLoading(false);
      },
      () => { setHistLoading(false); });
    return () => { unsubC(); unsubH(); };
  }, [conta]);

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

  const entrarGoogle = async () => { await signInWithPopup(auth, googleProvider); };
  const sair = () => {
    setConta(null); setDados({}); setContaExiste(false);
    setHist([]); setPromo(null); setCodigo(null); setLead(null); setSecao("");
    signOut(auth).catch(() => {});
  };

  const hasSession = !!gEmail;
  const isCliente = contaExiste;
  const isLead = !!lead && !isCliente;
  const isPromotor = !!promo && !!codigo;
  const nome = String(dados.nome || promo?.nome || gName || "");

  /* ----- estados sem painel ----- */
  if (!authReady) {
    return <Layout><div className="min-h-screen grid place-items-center px-6"><p className="text-muted text-sm">A carregar…</p></div></Layout>;
  }
  if (!hasSession) {
    return (
      <Layout>
        <Login cfg={cfg} onEntrarGoogle={entrarGoogle} />
        {toast && <Toast msg={toast} />}
      </Layout>
    );
  }

  /* ----- navegação por papéis ----- */
  const nav: { key: string; label: string; icon: typeof Home }[] = [];
  if (isCliente) nav.push(
    { key: "inicio", label: "Início", icon: Home },
    { key: "subscricao", label: "Subscrição", icon: Wifi },
    { key: "pagamentos", label: "Pagamentos", icon: Receipt },
    { key: "suporte", label: "Suporte", icon: Mail },
  );
  if (isLead) nav.push({ key: "pedido", label: "O meu pedido", icon: Clock });
  if (isPromotor) nav.push({ key: "promotor", label: "Promotor", icon: Megaphone });
  if (isCliente || isPromotor) nav.push({ key: "definicoes", label: "Definições", icon: Settings });

  const defaultSec = isCliente ? "inicio" : isPromotor ? "promotor" : isLead ? "pedido" : "definicoes";
  const active = nav.some((n) => n.key === secao) ? secao : defaultSec;
  const activeItem = nav.find((n) => n.key === active);

  const subAtivo = isCliente ? `Conta ${conta}` : isLead ? "Pedido de instalação" : gEmail || "";

  const content = (() => {
    switch (active) {
      case "inicio": return <ClienteHome dados={dados} hist={hist} go={setSecao} isPromotor={isPromotor} />;
      case "subscricao": return <ClienteSubscricao conta={conta!} dados={dados} hist={hist} cfg={cfg} showToast={showToast} />;
      case "pagamentos": return <ClientePagamentos conta={conta!} dados={dados} hist={hist} histLoading={histLoading} cfg={cfg} showToast={showToast} />;
      case "suporte": return <ClienteSuporte conta={conta!} showToast={showToast} />;
      case "promotor": return <PromotorPainel codigo={codigo!} promo={promo!} />;
      case "pedido": return lead ? <LeadStatus lead={lead} /> : null;
      case "definicoes": return <ClienteDefinicoes conta={conta} dados={dados} gEmail={gEmail} isCliente={isCliente} isPromotor={isPromotor} showToast={showToast} onSair={sair} />;
      default: return <div className="space-y-6"><CtaCliente /><TeaserPromotor temGoogle={!!gEmail} /></div>;
    }
  })();

  return (
    <PortalShell
      nome={nome} identity={gEmail || conta || ""} onSair={sair}
      nav={nav} active={active} onNav={setSecao}
      title={activeItem?.label || "A minha conta"} subtitle={subAtivo}
    >
      {content}
      {toast && <Toast msg={toast} />}
    </PortalShell>
  );
}

/* ===================== SHELL DE PAINEL (barra lateral) ===================== */
function PortalShell({ nome, identity, onSair, nav, active, onNav, title, subtitle, children }: {
  nome: string; identity: string; onSair: () => void;
  nav: { key: string; label: string; icon: typeof Home }[];
  active: string; onNav: (k: string) => void; title: string; subtitle?: string; children: ReactNode;
}) {
  const item = (it: { key: string; label: string; icon: typeof Home }, mobile = false) => {
    const on = active === it.key;
    return (
      <button key={it.key} onClick={() => onNav(it.key)}
        className={`flex items-center gap-3 transition-colors whitespace-nowrap ${mobile ? "px-4 py-2.5 text-xs font-mono uppercase tracking-widest border" : "px-4 py-3 text-sm"} ${on
          ? mobile ? "bg-fg text-bg border-fg" : "bg-card text-fg border-l-2 border-accent"
          : mobile ? "border-line text-muted hover:text-fg" : "text-muted hover:text-fg hover:bg-card/40 border-l-2 border-transparent"}`}>
        <it.icon size={mobile ? 14 : 18} /> {it.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col relative">
      <div className="noise-bg" />
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl text-fg">
              <img src="/logo-intime.png" alt="Intime" className="logo-img w-8 h-8" draggable={false} /> <span>Portal</span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-5">
              <a href="/" className="hidden sm:flex items-center gap-2 text-xs text-muted hover:text-fg transition-colors"><ExternalLink size={14} /> Ver o site</a>
              <div className="w-9 h-9 grid place-items-center rounded-full bg-card border border-line text-fg text-xs font-mono font-bold" title={identity}>{initials(nome || identity)}</div>
              <button onClick={onSair} className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"><LogOut size={16} /> <span className="hidden sm:inline">Sair</span></button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative z-10 w-full max-w-[1400px] mx-auto lg:flex">
        {nav.length > 1 && (
          <aside className="lg:w-60 lg:shrink-0 lg:border-r border-line">
            <nav className="hidden lg:flex flex-col gap-1 p-4 sticky top-16">{nav.map((it) => item(it))}</nav>
            <nav className="lg:hidden flex gap-2 overflow-x-auto px-6 py-3 border-b border-line">{nav.map((it) => item(it, true))}</nav>
          </aside>
        )}

        <main className="flex-1 min-w-0 px-6 lg:px-10 py-8 lg:py-12">
          <div className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl text-fg tracking-tight leading-none">{title}</h1>
            {subtitle && <p className="text-muted text-sm mt-3 font-mono">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

/* toast partilhado */
function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-7 z-[500] bg-fg text-bg px-6 py-3.5 text-sm font-medium shadow-2xl">{msg}</div>
  );
}

/* ---------- banner "em processamento" com contagem decrescente ---------- */
function ProcessamentoBanner({ target }: { target: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const ms = Math.max(0, target - now);
  const mm = Math.floor(ms / 60000), ss = Math.floor((ms % 60000) / 1000);
  const passou = now >= target;
  return (
    <div className="border border-accent/40 bg-accent/[0.06] p-6 md:p-8 conta-fade">
      <div className="flex items-center gap-3 mb-3">
        <RefreshCcw size={20} className="text-accent animate-spin" />
        <h3 className="font-display text-xl text-fg">O seu pedido está a ser processado</h3>
      </div>
      <p className="text-muted text-sm">Recebemos o seu pagamento. Estamos a recarregar a sua internet — não precisa de fazer mais nada.</p>
      {!passou ? (
        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-5xl text-accent tabular-nums leading-none">{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
          <span className="text-faint text-[11px] mb-1.5 font-mono uppercase tracking-widest">tempo estimado</span>
        </div>
      ) : (
        <p className="text-muted text-sm mt-3">Está quase a concluir — por vezes demora um pouco mais. Se precisar, fale connosco pelo WhatsApp.</p>
      )}
    </div>
  );
}

/* ===================== CLIENTE: INÍCIO (Home) ===================== */
function ClienteHome({ dados, hist, go, isPromotor }: { dados: DocumentData; hist: { id: string; d: DocumentData }[]; go: (k: string) => void; isPromotor: boolean }) {
  const alvo = processamentoTarget(dados, hist);
  const estado = String(dados.estado ?? "—");
  const atraso = emAtraso(estado);
  const prox = proximaData(dados, hist);
  const saldo = atraso ? mtValue(dados.mensalidade) : 0;

  const cards: { icon: typeof Wifi; title: string; desc: string; to: string }[] = [
    { icon: Wifi, title: "A minha subscrição", desc: "Pacote, estado e pedidos", to: "subscricao" },
    { icon: Receipt, title: "Pagamentos", desc: "Pagar e ver o histórico", to: "pagamentos" },
    { icon: Mail, title: "Suporte", desc: "Abrir e acompanhar pedidos", to: "suporte" },
    { icon: Settings, title: "Definições", desc: "Contactos e conta", to: "definicoes" },
  ];
  if (isPromotor) cards.push({ icon: Megaphone, title: "Promotor", desc: "Link e comissões", to: "promotor" });

  return (
    <div className="space-y-6">
      {alvo && <ProcessamentoBanner target={alvo} />}

      {/* Saldo / próximo pagamento */}
      <div className={panelPad}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-2">{atraso ? "Valor em dívida" : "Saldo"}</div>
            <div className="flex items-center gap-3">
              <span className="font-display text-5xl md:text-6xl text-fg leading-none">{saldo.toLocaleString("pt-PT")} <span className="text-2xl text-muted">MT</span></span>
              {!atraso && <CheckCircle2 className="text-accent" size={28} />}
            </div>
            <p className={`text-sm mt-3 ${atraso ? "text-[#ff6b6b]" : "text-muted"}`}>
              {atraso ? "Conta em atraso — regularize assim que possível." : prox ? `Próximo pagamento: ${dataExtenso(prox)}` : "Está tudo em dia."}
            </p>
          </div>
          <button onClick={() => go("pagamentos")} className="px-8 py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors flex items-center gap-2">
            {atraso ? "Pagar agora" : "Pagar"} <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* atalhos */}
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <button key={i} onClick={() => go(c.to)} className={`text-left ${panel} p-6 hover:border-accent/50 transition-colors group flex items-start gap-4`}>
            <span className="w-11 h-11 grid place-items-center border border-line text-accent shrink-0"><c.icon size={20} /></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg text-fg">{c.title}</h3>
                <ArrowRight size={16} className="text-faint group-hover:text-fg transition-colors shrink-0" />
              </div>
              <p className="text-muted text-sm mt-1">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===================== CLIENTE: SUBSCRIÇÃO ===================== */
function ClienteSubscricao({ conta, dados, hist, cfg, showToast }: {
  conta: string; dados: DocumentData; hist: { id: string; d: DocumentData }[]; cfg: ReturnType<typeof useSiteConfig>; showToast: (m: string) => void;
}) {
  const [mudar, setMudar] = useState(false);
  const estado = String(dados.estado ?? "—");
  const prox = proximaData(dados, hist);
  const pendente = dados.pacotePendente ? { pacote: String(dados.pacotePendente), mensalidade: String(dados.mensalidadePendente || "") } : null;
  const rows: [string, string][] = [
    ["Titular", String(dados.nome ?? "—")],
    ["Conta", conta],
    ["Pacote", String(dados.pacote ?? "—")],
    ["Mensalidade", dados.mensalidade ? `${dados.mensalidade} MT` : "—"],
    ["Ciclo", "A cada 30 dias"],
    ["Próximo pagamento", prox ? dataExtenso(prox) : "—"],
    ...(pendente ? [["Muda para", `${pendente.pacote}${pendente.mensalidade ? ` · ${pendente.mensalidade} MT` : ""} (próximo ciclo)`]] as [string, string][] : []),
  ];

  const abrirPedido = async (tipo: string, descricao: string) => {
    try {
      await addDoc(collection(db, "suporte"), { numeroConta: conta, tipo, descricao, estado: "Recebido", createdAt: serverTimestamp() });
      showToast(`Pedido enviado: ${tipo}. A equipa vai contactá-lo.`);
    } catch { showToast("Não foi possível enviar. Tente de novo."); }
  };
  const enviarMudanca = async (planoNome: string, novaMensalidade: string) => {
    try {
      await addDoc(collection(db, "suporte"), {
        numeroConta: conta, clienteId: dados.clienteId || "", tipo: "Mudança de pacote",
        pacoteAtual: dados.pacote || "", pacoteDesejado: planoNome, mensalidadeNova: novaMensalidade,
        descricao: `Mudar de "${dados.pacote || "—"}" para "${planoNome}"${novaMensalidade ? ` (${novaMensalidade} MT)` : ""} — a partir do próximo ciclo.`,
        estado: "Recebido", createdAt: serverTimestamp(),
      });
      setMudar(false);
      showToast("Pedido enviado. A mudança entra no próximo ciclo, após a equipa confirmar.");
    } catch { showToast("Não foi possível enviar. Tente de novo."); }
  };
  const pedirCancelamento = () => {
    if (window.confirm("Vamos abrir um pedido para a equipa o contactar, explicar valores pendentes e combinar a devolução dos equipamentos. A conta NÃO é cancelada automaticamente.\n\nConfirmar pedido de cancelamento?"))
      abrirPedido("Quero cancelar", `Pacote atual: ${dados.pacote || "—"}.`);
  };

  return (
    <div className="space-y-6">
      {/* tabela da subscrição (estilo Starlink) */}
      <div className={panel + " overflow-hidden"}>
        <div className="hidden sm:grid grid-cols-[1.4fr_1.4fr_auto] gap-4 px-6 py-4 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Subscrição</span><span>Local de serviço</span><span>Estado</span>
        </div>
        <div className="grid sm:grid-cols-[1.4fr_1.4fr_auto] gap-2 sm:gap-4 px-6 py-5 sm:items-center">
          <div className="text-fg font-medium">{dados.pacote || "—"}</div>
          <div className="text-muted text-sm">{localStr(dados)}</div>
          <span className={`justify-self-start text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border ${pillEstado(estado)}`}>{estado}</span>
        </div>
      </div>

      {/* detalhes */}
      <div className={panelPad}>
        <h3 className="font-display text-xl text-fg mb-5">Detalhes da subscrição</h3>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3.5 border-b border-line/60 last:border-0">
            <span className="text-muted text-sm">{k}</span>
            <span className="text-fg font-medium text-right">{v}</span>
          </div>
        ))}
        <p className="text-faint text-xs mt-4">Estes dados são geridos pela Intime. Para os alterar, fale com a equipa.</p>
      </div>

      {/* pedidos */}
      <div className={panelPad}>
        <h3 className="font-display text-xl text-fg mb-5">Pedidos</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {pendente
            ? <div className="border border-accent/40 bg-accent/[0.06] px-4 py-3.5 text-sm text-fg flex items-center gap-2"><RefreshCcw size={15} className="text-accent shrink-0" /> Mudança para <b>{pendente.pacote}</b> agendada para o próximo ciclo.</div>
            : <button className={btnGhost} onClick={() => setMudar(true)}><RefreshCcw size={15} /> Mudar de pacote</button>}
          <button className={btnGhost + " !text-[#ff6b6b] hover:!border-[#ff6b6b]/50"} onClick={pedirCancelamento}><Ban size={15} /> Pedir cancelamento</button>
        </div>
      </div>

      {mudar && <MudarPacoteModal dados={dados} plans={cfg.plans || []} onClose={() => setMudar(false)} onConfirm={enviarMudanca} />}
    </div>
  );
}

/* ---------- modal: escolher novo pacote (estilo "Manage Service Plan") ---------- */
function MudarPacoteModal({ dados, plans, onClose, onConfirm }: {
  dados: DocumentData; plans: { id: string; name: string; price: string; unit: string; tagline?: string }[];
  onClose: () => void; onConfirm: (nome: string, novaMensalidade: string) => Promise<void>;
}) {
  const atualNome = String(dados.pacote || "");
  const atualMens = mtValue(dados.mensalidade);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const disponiveis = plans.filter((p) => p.name && p.name !== atualNome);
  const selPlan = disponiveis.find((p) => p.name === sel);
  const novaMens = selPlan && selPlan.price !== "Sob" ? String(mtValue(selPlan.price)) : "";

  const confirmar = async () => {
    if (!selPlan) return;
    setBusy(true);
    await onConfirm(selPlan.name, novaMens);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-bg border border-line">
        <div className="sticky top-0 bg-bg/95 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-fg">Mudar de pacote</h3>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg"><XIcon size={16} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-2">O seu plano atual</div>
            <div className="border border-accent/40 bg-accent/[0.05] p-4 flex items-center justify-between gap-3">
              <div className="text-fg font-medium">{atualNome || "—"}</div>
              <div className="text-fg font-display text-lg">{atualMens ? `${atualMens.toLocaleString("pt-PT")} MT` : "—"}<span className="text-muted text-xs">/mês</span></div>
            </div>
          </div>
          <div>
            <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-2">Planos disponíveis</div>
            <div className="space-y-2">
              {disponiveis.map((p) => {
                const preco = p.price === "Sob" ? null : mtValue(p.price);
                const dif = preco != null ? preco - atualMens : null;
                const on = sel === p.name;
                return (
                  <button key={p.id} onClick={() => setSel(p.name)} className={`w-full text-left border p-4 transition-colors ${on ? "border-accent bg-accent/[0.06]" : "border-line hover:border-accent/50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-fg font-medium">{p.name}</div>
                        {p.tagline && <div className="text-muted text-xs mt-0.5">{p.tagline}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-fg font-display">{preco != null ? `${preco.toLocaleString("pt-PT")} MT` : "Sob avaliação"}</div>
                        {dif != null && dif !== 0 && <div className={`text-[11px] ${dif > 0 ? "text-[#f5b948]" : "text-accent"}`}>{dif > 0 ? "+" : ""}{dif.toLocaleString("pt-PT")}/mês</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
              {disponiveis.length === 0 && <p className="text-faint text-sm">Sem outros planos disponíveis.</p>}
            </div>
          </div>
          <p className="text-faint text-xs">A mudança entra em vigor no <b className="text-muted">próximo ciclo de 30 dias</b> — o ciclo atual mantém-se. A equipa confirma antes de aplicar.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className={btnGhost + " !w-auto px-6"}>Cancelar</button>
            <button onClick={confirmar} disabled={!selPlan || busy} className={btnPrimary}>{busy ? "A enviar…" : "Pedir mudança"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== CLIENTE: PAGAMENTOS (Billing) ===================== */
type MetodoPag = { tipo: string; nome?: string; numero?: string; ativo?: boolean };

function ClientePagamentos({ conta, dados, hist, histLoading, cfg, showToast }: {
  conta: string; dados: DocumentData; hist: { id: string; d: DocumentData }[];
  histLoading: boolean; cfg: ReturnType<typeof useSiteConfig>; showToast: (m: string) => void;
}) {
  // métodos de pagamento geridos pelo admin (cfg.metodosPagamento); default = M-Pesa
  const numeroMM = (cfg.contacts.whatsapp && cfg.contacts.whatsapp.length) ? cfg.contacts.whatsapp : cfg.contacts.phone;
  const ativos = (cfg.metodosPagamento || []).filter((m) => m && m.ativo !== false && (m.tipo || "").trim());
  const metodos: MetodoPag[] = ativos.length ? ativos : [{ tipo: "M-Pesa", nome: "Intime", numero: numeroMM }];

  const atraso = emAtraso(estadoStr(dados));
  const prox = proximaData(dados, hist);
  const saldo = atraso ? mtValue(dados.mensalidade) : 0;
  const alvo = processamentoTarget(dados, hist);

  return (
    <div className="space-y-6">
      {alvo && <ProcessamentoBanner target={alvo} />}

      {/* resumo: saldo + ciclo */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={panelPad + (atraso ? " border-[#ff6b6b]/40" : "")}>
          <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-2">{atraso ? "Valor em dívida" : "Saldo"}</div>
          <div className="flex items-center gap-2">
            <span className={`font-display text-5xl ${atraso ? "text-[#ff6b6b]" : "text-fg"}`}>{saldo.toLocaleString("pt-PT")} <span className="text-lg text-muted">MT</span></span>
            {!atraso && <CheckCircle2 className="text-accent" size={22} />}
          </div>
          <p className={`text-sm mt-2 ${atraso ? "text-[#ff6b6b]" : "text-muted"}`}>{atraso ? "Regularize para manter o serviço ativo." : "Está tudo em dia."}</p>
        </div>
        <div className={panelPad}>
          <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-2">Ciclo de faturação</div>
          <p className="text-fg text-sm">A cada 30 dias desde a ativação.</p>
          {prox && <p className="text-muted text-sm mt-1">Próximo: {dataExtenso(prox)}.</p>}
        </div>
      </div>

      {/* próxima fatura (pré-visualização) */}
      {prox && mtValue(dados.mensalidadePendente || dados.mensalidade) > 0 && (
        <div className={panelPad + " flex items-center justify-between gap-4 flex-wrap"}>
          <div>
            <div className="text-faint text-[11px] font-mono uppercase tracking-widest mb-1">Próxima fatura</div>
            <div className="text-fg"><b>{dados.mensalidadePendente || dados.mensalidade} MT</b> · vence {dataExtenso(prox)}</div>
            <div className="text-muted text-sm mt-0.5">{dados.pacotePendente || dados.pacote || ""} · próximo período de 30 dias{dados.pacotePendente ? " · novo pacote" : ""}</div>
          </div>
          <button onClick={() => abrirProximaFatura(dados, prox, cfg.contacts)} className="inline-flex items-center gap-2 px-5 py-3 border border-line text-fg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors"><FileText size={15} /> Pré-visualizar</button>
        </div>
      )}

      {/* PAGAR — só disponível quando há dívida e não está já em processamento */}
      {alvo
        ? null
        : atraso
        ? <PagamentoWizard conta={conta} dados={dados} metodos={metodos} contactos={cfg.contacts} cloudinary={cfg.cloudinary} showToast={showToast} />
        : (
          <div className={panelPad + " text-center"}>
            <CheckCircle2 className="mx-auto mb-3 text-accent" size={30} />
            <h3 className="font-display text-2xl text-fg mb-1">Sem nada a pagar</h3>
            <p className="text-muted text-sm">A sua conta está em dia. Quando houver um valor a pagar, o botão de pagamento aparece aqui.</p>
          </div>
        )}

      {/* histórico */}
      <div className={panel}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-display text-lg text-fg">Histórico de pagamentos</h3>
          <span className="font-mono text-[11px] text-faint">{hist.length}</span>
        </div>
        {histLoading ? (
          <p className="text-muted text-sm px-6 py-10 text-center">A carregar…</p>
        ) : hist.length === 0 ? (
          <p className="text-faint text-sm px-6 py-12 text-center">Ainda não há pagamentos registados.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {hist.map(({ id, d }) => {
              const estado = String(d.estado || "Pendente");
              const e = estado.toLowerCase();
              const aprovado = e.includes("aprov") || e.includes("pago");
              const recusado = e.includes("recus");
              const color = recusado ? "#ff6b6b" : aprovado ? "var(--accent,#5CF2C8)" : "#f5b948";
              const Icon = recusado ? XIcon : aprovado ? Check : Clock;
              const valor = d.valor != null ? `${Math.round(Number(d.valor) || 0)} MT` : "—";
              return (
                <div key={id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 grid place-items-center border border-line shrink-0" style={{ color }}><Icon size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-fg font-medium">{valor}</div>
                    <div className="text-faint text-xs">{`${d.mes || ""} · ${d.metodo || ""}${d.comprovativoUrl ? " · com foto" : ""}`}</div>
                    <div className="text-faint text-xs">{fmtTs(d.data)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {aprovado && <button onClick={() => abrirFatura(d, dados, cfg.contacts)} className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-fg hover:bg-fg hover:text-bg transition-colors" title="Ver / descarregar fatura"><FileText size={12} /> Fatura</button>}
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border" style={{ color, borderColor: color }}>{estado}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- ASSISTENTE DE PAGAMENTO (animado, por passos) ---------- */
type PagStep = "metodo" | "origem" | "transferir" | "verificar" | "fallback" | "enviado";
function isMobileMoney(m?: MetodoPag) { const t = String(m?.tipo || "").toLowerCase(); return t.includes("pesa") || t.includes("mola"); }

function PagamentoWizard({ conta, dados, metodos, contactos, cloudinary, showToast }: {
  conta: string; dados: DocumentData; metodos: MetodoPag[];
  contactos: { email: string; whatsapp: string; phone: string };
  cloudinary: { cloudName: string; uploadPreset: string }; showToast: (m: string) => void;
}) {
  const podeFoto = !!(cloudinary?.cloudName && cloudinary?.uploadPreset);
  const valor = mtValue(dados.mensalidade);
  const numeroDaConta = String(dados.contactoWhatsapp || dados.whatsapp || "").trim();

  const [step, setStep] = useState<PagStep>(metodos.length === 1 ? (isMobileMoney(metodos[0]) ? "origem" : "transferir") : "metodo");
  const [metodoSel, setMetodoSel] = useState<MetodoPag | null>(metodos.length === 1 ? metodos[0] : null);
  const [usarConta, setUsarConta] = useState(!!numeroDaConta);
  const [numeroOrigem, setNumeroOrigem] = useState(numeroDaConta);
  const [codigo, setCodigo] = useState("");
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState(false);

  const reiniciar = () => {
    setMetodoSel(metodos.length === 1 ? metodos[0] : null);
    setStep(metodos.length === 1 ? (isMobileMoney(metodos[0]) ? "origem" : "transferir") : "metodo");
    setCodigo(""); setMatched(false);
  };

  const registar = async (estado: string, extra: Record<string, unknown>) => {
    await addDoc(collection(db, "pagamentos"), {
      clienteId: dados.clienteId || "", numeroConta: conta, clienteNome: dados.nome || "",
      mes: monthKey(), valor, metodo: metodoSel?.tipo || "M-Pesa", estado, viaPortal: true,
      numeroOrigem: numeroOrigem.replace(/\D/g, "") || null,
      ...(dados.promotor ? { promotor: dados.promotor } : {}),
      data: serverTimestamp(), ...extra,
    });
  };

  // varredura das SMS de pagamento (gateway Intime → transacoesMpesa)
  const scanSms = async (): Promise<DocumentData | null> => {
    const local = numeroOrigem.replace(/\D/g, "").slice(-9);
    if (!local) return null;
    try {
      const q = query(collection(db, "transacoesMpesa"), where("remetente", "==", local));
      const snap = await getDocs(q);
      const now = Date.now();
      const m = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((t: DocumentData) => {
        const v = typeof t.valor === "number" ? t.valor : 0;
        const ts = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : now;
        const recente = (now - ts) < 1000 * 60 * 60 * 24;
        return (valor === 0 || v + 0.01 >= valor) && recente;
      });
      return m || null;
    } catch { return null; }
  };

  // ao entrar em "verificar", corre a varredura (com tempo para a animação respirar)
  useEffect(() => {
    if (step !== "verificar") return;
    let alive = true;
    (async () => {
      const [found] = await Promise.all([scanSms(), new Promise((r) => setTimeout(r, 1800))]);
      if (!alive) return;
      if (found) {
        try { await registar("Aprovado", { codigo: (found as DocumentData).codigo || (found as DocumentData).id || "", autoConfirmado: true }); } catch { /* */ }
        setMatched(true); setStep("enviado");
      } else {
        setStep("fallback");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const submeterCodigo = async () => {
    const c = codigo.trim().toUpperCase();
    if (c.length < 6) { showToast("Insira o código da transação."); return; }
    setBusy(true);
    try {
      let estado = "Pendente";
      try { const t = await getDoc(doc(db, "transacoesMpesa", c)); if (t.exists()) { const v = typeof t.data().valor === "number" ? t.data().valor as number : 0; if (valor === 0 || v + 0.01 >= valor) estado = "Aprovado"; } } catch { /* */ }
      await registar(estado, { codigo: c });
      setMatched(estado === "Aprovado"); setStep("enviado");
    } catch { showToast("Erro ao submeter. Tente de novo."); }
    finally { setBusy(false); }
  };

  const enviarComprovativo = async (file?: File) => {
    if (!file) return;
    if (!podeFoto) { showToast("Envio de foto indisponível. Use o código ou envie pelo WhatsApp."); return; }
    setBusy(true);
    try {
      const url = await uploadCloudinary(file, cloudinary.cloudName, cloudinary.uploadPreset, `comprovativos/${conta}`);
      await registar("Pendente", { comprovativoUrl: url, codigo: codigo.trim().toUpperCase() || null });
      setMatched(false); setStep("enviado");
    } catch { showToast("Não foi possível enviar o comprovativo. Tente de novo ou envie pelo WhatsApp."); }
    finally { setBusy(false); }
  };

  const waDigits = (contactos.whatsapp || contactos.phone || "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(`Olá, sou o cliente ${conta}. Preciso de ajuda com um pagamento.`)}`;
  const telUrl = `tel:${contactos.phone || contactos.whatsapp || ""}`;

  // ----- stepper -----
  const fluxo: PagStep[] = isMobileMoney(metodoSel) || !metodoSel ? ["metodo", "origem", "transferir", "verificar"] : ["metodo", "transferir", "verificar"];
  const idxAtual = Math.max(0, fluxo.indexOf(step === "fallback" || step === "enviado" ? "verificar" : step));
  const stepLabels: Record<string, string> = { metodo: "Método", origem: "Número", transferir: "Transferir", verificar: "Confirmar" };

  return (
    <div className={panelPad + " overflow-hidden"}>
      {/* cabeçalho + progresso */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h3 className="font-display text-xl text-fg">Pagar {valor.toLocaleString("pt-PT")} MT</h3>
        {step !== "enviado" && (
          <div className="flex items-center gap-2">
            {fluxo.filter((f) => f !== "metodo" || metodos.length > 1).map((f, i, arr) => (
              <div key={f} className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors ${idxAtual >= fluxo.indexOf(f) ? "text-accent border-accent/40 bg-accent/10" : "text-faint border-line"}`}>{stepLabels[f]}</span>
                {i < arr.length - 1 && <span className="w-4 h-px bg-line" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div key={step} className="step-in">
        {/* PASSO: MÉTODO */}
        {step === "metodo" && (
          <div className="space-y-3">
            <p className="text-muted text-sm mb-1">Como pretende pagar?</p>
            {metodos.map((m, i) => (
              <button key={i} onClick={() => { setMetodoSel(m); setStep(isMobileMoney(m) ? "origem" : "transferir"); }}
                className="w-full text-left border border-line bg-bg p-5 hover:border-accent/50 transition-colors group flex items-center gap-4">
                <span className="w-11 h-11 grid place-items-center border border-line text-accent shrink-0"><Wallet size={20} /></span>
                <div className="flex-1 min-w-0"><div className="text-fg font-medium">{m.tipo}</div>{m.nome && <div className="text-faint text-xs">{m.nome}</div>}</div>
                <ArrowRight size={18} className="text-faint group-hover:text-fg transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* PASSO: NÚMERO DE ORIGEM */}
        {step === "origem" && (
          <div className="space-y-4">
            <p className="text-muted text-sm">Com que número {metodoSel?.tipo} vai pagar?</p>
            {numeroDaConta && (
              <label className="flex items-center gap-3 border border-line bg-bg px-4 py-3.5 cursor-pointer hover:border-accent/40 transition-colors">
                <input type="checkbox" className="accent-[var(--accent)]" checked={usarConta}
                  onChange={(e) => { setUsarConta(e.target.checked); if (e.target.checked) setNumeroOrigem(numeroDaConta); }} />
                <span className="text-sm text-fg">Usar o número da minha conta <span className="font-mono text-muted">({numeroDaConta})</span></span>
              </label>
            )}
            <div>
              <label className={lbl}>Número de origem</label>
              <input className={field} inputMode="tel" placeholder="8X XXX XXXX" value={numeroOrigem}
                onChange={(e) => { setNumeroOrigem(e.target.value); setUsarConta(false); }} />
            </div>
            <div className="flex gap-3">
              {metodos.length > 1 && <button className={btnGhost + " !w-auto px-6"} onClick={() => setStep("metodo")}>Voltar</button>}
              <button className={btnPrimary} disabled={numeroOrigem.replace(/\D/g, "").length < 9} onClick={() => setStep("transferir")}>Continuar</button>
            </div>
          </div>
        )}

        {/* PASSO: TRANSFERIR */}
        {step === "transferir" && (
          <div className="space-y-5">
            <div className="border border-dashed border-accent/40 bg-accent/[0.04] p-6 text-center">
              <p className="text-muted text-sm">Transfira via <b className="text-fg">{metodoSel?.tipo}</b></p>
              <div className="font-display text-5xl text-fg my-2">{valor.toLocaleString("pt-PT")} <span className="text-2xl text-muted">MT</span></div>
              <p className="text-muted text-sm mb-1">para o número de pagamento da Intime:</p>
              <button onClick={() => { navigator.clipboard?.writeText(String(metodoSel?.numero || "")).then(() => showToast("Número copiado.")).catch(() => {}); }}
                className="inline-flex items-center gap-2 font-display text-3xl text-accent hover:opacity-80 transition-opacity">
                {metodoSel?.numero || "(definido pela Intime)"} <Copy size={18} />
              </button>
              {metodoSel?.nome && <p className="text-faint text-xs mt-2">Titular: {metodoSel.nome}</p>}
            </div>
            <p className="text-muted text-sm text-center">Depois de transferir, confirme abaixo. Vamos procurar o seu pagamento automaticamente.</p>
            <div className="flex gap-3">
              {isMobileMoney(metodoSel) && <button className={btnGhost + " !w-auto px-6"} onClick={() => setStep("origem")}>Voltar</button>}
              <button className={btnPrimary} onClick={() => setStep("verificar")}><Check size={16} /> Já efetuei o pagamento</button>
            </div>
          </div>
        )}

        {/* PASSO: VERIFICAR (varredura) */}
        {step === "verificar" && (
          <div className="py-10 text-center">
            <div className="ring-pulse relative w-16 h-16 mx-auto grid place-items-center border border-accent/40 rounded-full text-accent mb-6">
              <RefreshCcw size={24} className="animate-spin" />
            </div>
            <h4 className="font-display text-xl text-fg mb-1">A procurar o seu pagamento…</h4>
            <p className="text-muted text-sm">A verificar as transações {metodoSel?.tipo} recebidas no número da Intime.</p>
          </div>
        )}

        {/* PASSO: FALLBACK (não encontrado → código ou comprovativo) */}
        {step === "fallback" && (
          <div className="space-y-5">
            <div className="border border-line bg-bg p-5 text-sm text-muted">
              Ainda não encontrámos o seu pagamento automaticamente — às vezes a confirmação demora um pouco. Ajude-nos a confirmar mais depressa:
            </div>
            <div>
              <label className={lbl}>ID / código da transação</label>
              <input className={field + " mb-3"} placeholder="Ex.: CI8R4T2X9P" spellCheck={false} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              <button className={btnPrimary} disabled={busy} onClick={submeterCodigo}>{busy ? "A confirmar…" : "Confirmar com o código"}</button>
            </div>
            <div className="flex items-center gap-4 text-faint text-xs"><span className="flex-1 h-px bg-line" /> ou <span className="flex-1 h-px bg-line" /></div>
            {podeFoto ? (
              <label className={btnGhost + " cursor-pointer"}>
                <Upload size={15} /> {busy ? "A enviar…" : "Anexar foto do comprovativo"}
                <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => enviarComprovativo(e.target.files?.[0])} />
              </label>
            ) : (
              <a href={waUrl} target="_blank" rel="noopener" className={btnGhost}>
                <Mail size={15} /> Enviar comprovativo pelo WhatsApp
              </a>
            )}
            <button className="w-full text-center text-muted text-sm hover:text-fg transition-colors" onClick={() => setStep("verificar")}>Tentar procurar de novo</button>
          </div>
        )}

        {/* PASSO: ENVIADO (confirmação animada) */}
        {step === "enviado" && (
          <div className="py-8 text-center">
            <div className={`pop-in w-20 h-20 mx-auto grid place-items-center rounded-full mb-5 ${matched ? "bg-accent text-bg" : "border-2 border-accent text-accent"}`}>
              <Check size={38} />
            </div>
            <h4 className="font-display text-2xl text-fg mb-2">{matched ? "Pagamento confirmado!" : "Pagamento recebido"}</h4>
            <p className="text-muted text-sm max-w-md mx-auto">
              {matched
                ? "Encontrámos a sua transação e a sua conta vai ser atualizada já a seguir. Obrigado!"
                : "Recebemos os seus dados. A confirmação costuma demorar até 10 minutos (muitas vezes menos)."}
            </p>
            <p className="text-faint text-sm mt-4">Está com alguma dificuldade? Fale connosco:</p>
            <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
              <a href={waUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-fg font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors">WhatsApp</a>
              <a href={telUrl} className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-fg font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors">Ligar</a>
            </div>
            <button className="mt-6 text-muted text-sm underline underline-offset-4 hover:text-fg transition-colors" onClick={reiniciar}>Fazer outro pagamento</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== CLIENTE: SUPORTE (Messages) ===================== */
function ClienteSuporte({ conta, showToast }: { conta: string; showToast: (m: string) => void }) {
  const [tickets, setTickets] = useState<{ id: string; d: DocumentData }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_SUPORTE[0]);
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // sem orderBy para não exigir índice composto — ordena no cliente
    const q = query(collection(db, "suporte"), where("numeroConta", "==", conta));
    const unsub = onSnapshot(q,
      (s) => {
        const arr = s.docs.map((d) => ({ id: d.id, d: d.data() }));
        arr.sort((a, b) => ((b.d.createdAt?.seconds || 0) - (a.d.createdAt?.seconds || 0)));
        setTickets(arr); setLoading(false);
      },
      () => setLoading(false));
    return () => unsub();
  }, [conta]);

  const enviar = async () => {
    if (!descricao.trim()) { showToast("Descreva o assunto."); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, "suporte"), { numeroConta: conta, tipo, descricao: descricao.trim(), estado: "Recebido", createdAt: serverTimestamp() });
      setDescricao(""); setOpen(false); showToast("Pedido enviado. A equipa vai responder.");
    } catch { showToast("Não foi possível enviar. Tente de novo."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 px-6 py-3 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors">
          <Plus size={15} /> Novo pedido
        </button>
      </div>

      {open && (
        <div className={panelPad + " conta-fade"}>
          <h3 className="font-display text-xl text-fg mb-5">Abrir pedido de suporte</h3>
          <div className="mb-4">
            <label className={lbl}>Assunto</label>
            <select className={field} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_SUPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mb-5">
            <label className={lbl}>Descrição</label>
            <textarea className={field + " min-h-[120px] resize-y"} placeholder="Descreva o que se passa…" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <button className={btnPrimary} disabled={busy} onClick={enviar}>{busy ? "A enviar…" : "Enviar pedido"}</button>
        </div>
      )}

      <div className={panel}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-display text-lg text-fg">Os meus pedidos</h3>
          <span className="font-mono text-[11px] text-faint">{tickets.length}</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-10 text-center">A carregar…</p>
        ) : tickets.length === 0 ? (
          <p className="text-faint text-sm px-6 py-12 text-center">Ainda não abriu nenhum pedido. Use “Novo pedido” acima.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {tickets.map(({ id, d }) => {
              const est = String(d.estado || "Recebido");
              const fechado = est.toLowerCase().includes("conclu") || est.toLowerCase().includes("resolv") || est.toLowerCase().includes("fechad");
              return (
                <div key={id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="text-fg font-medium">{d.tipo || "Pedido"}</div>
                    {d.descricao && <div className="text-muted text-sm mt-0.5 line-clamp-2">{d.descricao}</div>}
                    <div className="text-faint text-xs mt-1">{fmtTs(d.createdAt)}</div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border shrink-0 ${fechado ? "text-accent border-accent/40 bg-accent/10" : "text-muted border-line"}`}>{est}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== CLIENTE: DEFINIÇÕES (Settings) ===================== */
function ClienteDefinicoes({ conta, dados, gEmail, isCliente, isPromotor, showToast, onSair }: {
  conta: string | null; dados: DocumentData; gEmail: string | null;
  isCliente: boolean; isPromotor: boolean; showToast: (m: string) => void; onSair: () => void;
}) {
  const [wa, setWa] = useState("");
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWa(String(dados.contactoWhatsapp ?? dados.whatsapp ?? ""));
    setAlt(String(dados.contactoAlternativo ?? ""));
  }, [dados]);

  // NÃO escreve email (identidade/login — só a equipa muda) nem whatsappLast4 (fator de login).
  const guardar = async () => {
    if (!conta) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "portalContas", conta), {
        contactoWhatsapp: wa.trim(), contactoAlternativo: alt.trim(),
        contactoAtualizadoEm: serverTimestamp(),
      }, { merge: true });
      showToast("Contacto atualizado.");
    } catch { showToast("Não foi possível guardar. Tente de novo."); }
    finally { setSaving(false); }
  };

  const profile: [string, string][] = [
    ["Nome", String(dados.nome || "—")],
    ["Email", String(dados.contactoEmail || dados.email || gEmail || "—")],
    ["WhatsApp", String(dados.contactoWhatsapp || dados.whatsapp || "—")],
    ["Conta", conta || "—"],
  ];

  return (
    <div className="space-y-6">
      {/* perfil */}
      <div className={panelPad}>
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <h3 className="font-display text-xl text-fg">Perfil</h3>
          <div className="flex items-center gap-2">
            {isCliente && <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 border border-line text-muted">Cliente</span>}
            {isPromotor && <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 border border-accent/40 text-accent bg-accent/10">Promotor</span>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8">
          {profile.map(([k, v]) => (
            <div key={k} className="py-3 border-b border-line/60">
              <div className="text-faint text-[11px] font-mono uppercase tracking-widest">{k}</div>
              <div className="text-fg mt-1 break-words">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* atualizar contacto */}
      {isCliente && (
        <div className={panelPad}>
          <h3 className="font-display text-xl text-fg mb-5">Atualizar contacto</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Número de WhatsApp</label><input className={field} value={wa} onChange={(e) => setWa(e.target.value)} /></div>
            <div><label className={lbl}>Contacto alternativo (opcional)</label><input className={field} value={alt} onChange={(e) => setAlt(e.target.value)} /></div>
          </div>
          <p className="text-faint text-xs mt-4">O <b className="text-muted font-medium">email</b> é o seu acesso à conta e não é editável aqui. Para o alterar, fale com a equipa.</p>
          <div className="mt-5 sm:max-w-xs"><button className={btnPrimary} disabled={saving} onClick={guardar}>{saving ? "A guardar…" : "Guardar contacto"}</button></div>
        </div>
      )}

      {/* sessão */}
      <div className={panelPad + " flex items-center justify-between gap-4 flex-wrap"}>
        <div>
          <h3 className="font-display text-xl text-fg">Sessão</h3>
          <p className="text-muted text-sm mt-1">Terminar sessão neste dispositivo.</p>
        </div>
        <button onClick={onSair} className="inline-flex items-center gap-2 px-6 py-3 border border-line text-fg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:border-[#ff6b6b]/50 hover:text-[#ff6b6b] transition-colors">
          <LogOut size={15} /> Sair
        </button>
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
      <div className={panelPad}>
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
    <div className={panelPad + " text-center"}>
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

  const link = `${window.location.origin}/p/${codigo}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  };

  const kpis = [
    { icon: Users, value: nLeads, label: "Leads trazidos" },
    { icon: UserCheck, value: nClientes, label: "Clientes ativos" },
    { icon: Wallet, value: `${comissao} MT`, label: "Comissão acumulada", accent: true },
    { icon: TrendingUp, value: `${pct}%`, label: "Por pagamento" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <div key={i} className={`border p-6 ${s.accent ? "border-accent bg-accent/[0.06]" : "border-line bg-card"}`}>
            <s.icon size={20} className={`mb-4 ${s.accent ? "text-accent" : "text-faint"}`} />
            <div className={`font-display text-4xl leading-none mb-1 ${s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className={panelPad}>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-faint mb-4">
          <Link2 size={14} /> O meu link de promotor · código <span className="text-fg">{codigo}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <code className="flex-1 min-w-0 break-all bg-bg border border-line px-4 py-3.5 text-fg text-sm">{link}</code>
          <button onClick={copy} className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-fg text-bg font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-accent transition-colors">
            {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
          </button>
        </div>
        <p className="text-faint text-xs mt-3">Partilhe este link. Quem aderir por ele fica associado a si e gera-lhe {pct}% de comissão recorrente enquanto for cliente.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className={panel}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="font-display text-lg flex items-center gap-2"><UserCheck size={16} className="text-accent" /> Os meus clientes</h2>
            <span className="font-mono text-[11px] text-faint">{clientes.length}</span>
          </div>
          {clientes.length === 0 ? (
            <p className="text-faint text-sm px-6 py-12 text-center">Assim que um lead seu virar cliente, aparece aqui.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {clientes.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0"><div className="text-fg font-medium truncate">{c.nome || "—"}</div><div className="text-xs text-faint">{c.pacote || "—"}</div></div>
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-line text-faint shrink-0">{c.estado || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={panel}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="font-display text-lg flex items-center gap-2"><Users size={16} className="text-faint" /> Pedidos que trouxe</h2>
            <span className="font-mono text-[11px] text-faint">{leads.length}</span>
          </div>
          {leads.length === 0 ? (
            <p className="text-faint text-sm px-6 py-12 text-center">Partilhe o seu link para começar a trazer pedidos.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {leads.map((l, i) => {
                const st = String(l.status || "novo");
                return (
                  <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <div className="text-fg font-medium truncate">{l.nome || "—"}</div>
                      <div className="text-xs text-faint">{[l.plano, l.cidade].filter(Boolean).join(" · ") || "—"} · {fmtData(l.data)}</div>
                    </div>
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 shrink-0 ${st === "concluido" ? "bg-accent text-bg" : "border border-line text-faint"}`}>{PROMO_STATUS_LABEL[st] || st}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== PROMOTOR: CONVITE (não é promotor) ===================== */
function TeaserPromotor({ temGoogle }: { temGoogle: boolean }) {
  return (
    <div className={panelPad}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 grid place-items-center border border-line text-accent shrink-0"><Wallet size={18} /></div>
        <div>
          <h3 className="font-display text-xl text-fg mb-1">Ganhe comissões com a Intime</h3>
          <p className="text-muted text-sm mb-4">Como promotor, ganha uma percentagem por cada pagamento dos clientes que trouxer — de forma recorrente. Ser promotor é por convite da equipa.</p>
          <Link to="/contacto" className="inline-flex items-center gap-2 px-5 py-3 border border-line text-fg font-mono text-[10px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors">
            <Megaphone size={14} /> Quero ser promotor
          </Link>
          {!temGoogle && <p className="text-faint text-xs mt-3">Já é promotor? Entre com Google.</p>}
        </div>
      </div>
    </div>
  );
}

/* ===================== LOGIN ===================== */
/* Logótipo Google multicolor (lucide não traz a marca) */
function GoogleIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function Login({ cfg, onEntrarGoogle }: {
  cfg: ReturnType<typeof useSiteConfig>; onEntrarGoogle: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const tagline = cfg.taglines && cfg.taglines.length ? cfg.taglines[0] : "A sua casa ligada ao mundo.";

  const entrarGoogle = async () => {
    setBusy(true); setErro("");
    try { await onEntrarGoogle(); }
    catch { setErro("Não foi possível entrar com o Google. Tente de novo."); }
    finally { setBusy(false); }
  };

  return (
    <section className="relative min-h-screen w-full grid lg:grid-cols-2 conta-fade">
      {/* ESQUERDA: imersivo */}
      <div className="relative hidden lg:flex flex-col justify-between px-14 xl:px-24 pt-40 pb-16 overflow-hidden bg-card/30 border-r border-line">
        <div className="pointer-events-none absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-accent/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-52 -left-32 w-[34rem] h-[34rem] rounded-full bg-accent/10 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 text-fg opacity-[0.04]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

        <span className="relative font-mono text-accent text-[11px] uppercase tracking-[0.3em]">Portal Intime</span>

        <div className="relative max-w-xl">
          <h2 className="font-display text-5xl xl:text-7xl text-fg leading-[0.98] tracking-tight mb-9">{tagline}</h2>
          <ul className="space-y-4">
            {([[Wifi, "Subscrição, pagamentos e faturas num só lugar"], [Megaphone, "O seu link e comissões de promotor"], [Clock, "O estado do seu pedido de instalação"]] as const).map(([Ic, t], i) => (
              <li key={i} className="flex items-center gap-4 text-muted text-base">
                <span className="w-10 h-10 grid place-items-center border border-line text-accent shrink-0 bg-bg/40"><Ic size={17} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative font-mono text-[10px] uppercase tracking-[0.3em] text-faint">Intime · Starlink em Moçambique</div>
      </div>

      {/* DIREITA: formulário */}
      <div className="relative flex items-center justify-center px-6 sm:px-10 pt-32 pb-20 lg:py-20">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logo-intime.png" alt="Intime" className="logo-img w-9 h-9" draggable={false} />
            <span className="font-display font-bold text-2xl text-fg tracking-tight">INTIME</span>
          </div>

          <span className="font-mono text-accent text-[10px] uppercase tracking-[0.25em] mb-4 block">Bem-vindo de volta</span>
          <h1 className="text-5xl md:text-6xl font-display font-medium text-fg tracking-tighter mb-4">Entrar.</h1>
          <p className="text-muted text-base mb-10 leading-relaxed">
            Cliente, promotor ou a pedir instalação — uma só entrada. Com o Google reconhecemos a sua conta automaticamente.
          </p>

          <button className={btnPrimary + " !py-5"} disabled={busy} onClick={entrarGoogle}>
            {busy ? "A entrar…" : <><GoogleIcon size={18} /> Continuar com Google</>}
          </button>

          {erro && <p className="text-[#ff6b6b] text-sm mt-4">{erro}</p>}

          <p className="text-faint text-xs mt-5">Já é cliente da Intime? Use o mesmo email com que falou connosco. Na app do cliente também pode entrar com o número de conta.</p>

          <p className="text-muted text-sm mt-10 pt-7 border-t border-line">
            Ainda não é cliente? <Link to="/aderir" className="underline hover:text-fg">Pedir instalação</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
