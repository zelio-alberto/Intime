import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { input, label, card, pageTitle, pageSub } from "./ui";
import { UserPlus, Trash2, Copy, Check, Link2, Power, RefreshCcw, Ticket } from "lucide-react";

type Promo = {
  codigo: string; nome?: string; email?: string; telefone?: string; whatsapp?: string;
  numeroMpesa?: string; nomeMpesa?: string; zona?: string; percentagem?: number; ativo?: boolean;
};
type Stats = { leads: number; clientes: number; comissao: number };

const COMISSAO_PADRAO = 8;
// Sem caracteres ambíguos (0/O, 1/I, etc.).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(existing: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    let s = "PR";
    for (let j = 0; j < 3; j++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!existing.has(s)) return s;
  }
  return "PR" + Date.now().toString(36).toUpperCase().slice(-3);
}
function randomToken(): string {
  let s = "";
  for (let j = 0; j < 8; j++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
function estadoAprovado(e?: string) { const x = (e || "").toLowerCase(); return x.includes("aprov") || x.includes("pago"); }

export default function Promotores() {
  const { user } = useAdminAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", numeroMpesa: "" });
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [convite, setConvite] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const loadPromos = async () => {
    try {
      const s = await getDocs(collection(db, "promotores"));
      const list = s.docs.map((d) => ({ codigo: d.id, ...(d.data() as Omit<Promo, "codigo">) }));
      setPromos(list);
      const st: Record<string, Stats> = {};
      s.docs.forEach((d) => { const x = d.data().stats; if (x) st[d.id] = { leads: x.leads || 0, clientes: x.clientes || 0, comissao: x.comissao || 0 }; });
      setStats((prev) => ({ ...st, ...prev }));
      return list;
    } catch { return []; }
  };

  useEffect(() => { loadPromos(); }, []);

  const existing = useMemo(() => new Set(promos.map((p) => p.codigo)), [promos]);

  // Gera um link de cadastro de uso único.
  const gerarConvite = async () => {
    setGerando(true);
    const token = randomToken();
    try {
      await setDoc(doc(db, "promotorConvites", token), { usado: false, criadoPor: user?.email || "", criadoEm: serverTimestamp() });
      setConvite(token);
      flash("Link de cadastro gerado ✓ — copie e envie a um promotor.");
    } catch { flash("Erro ao gerar. Verifique as regras do Firestore."); }
    finally { setGerando(false); }
  };

  /**
   * Recalcula leads/clientes/comissão de cada promotor a partir de
   * inscricoes/portalContas/pagamentos (leitura só do admin) e grava o resumo
   * em cada promotores/{codigo} — é daí que o painel do promotor lê.
   */
  const sincronizar = async () => {
    setSincronizando(true);
    const pcts: Record<string, number> = {};
    promos.forEach((p) => { pcts[p.codigo] = p.percentagem ?? COMISSAO_PADRAO; });

    const leadsBy: Record<string, any[]> = {};
    const clientesBy: Record<string, any[]> = {};
    const baseBy: Record<string, number> = {};
    try {
      const s = await getDocs(collection(db, "inscricoes"));
      s.docs.forEach((d) => {
        const x = d.data(); const p = x.promotor; if (!p) return;
        (leadsBy[p] = leadsBy[p] || []).push({ nome: x.nome || "", plano: x.plano || "", cidade: x.cidade || "", status: x.status || "novo", data: x.createdAt || null });
      });
    } catch { flash("Sem permissão para ler inscrições. Publique as regras do Firestore primeiro."); setSincronizando(false); return; }
    try {
      const s = await getDocs(collection(db, "portalContas"));
      s.docs.forEach((d) => {
        const x = d.data(); const p = x.promotor; if (!p) return;
        (clientesBy[p] = clientesBy[p] || []).push({ conta: d.id, nome: x.nome || "", pacote: x.pacote || "", estado: x.estado || "" });
      });
    } catch { /* sem regra de list em portalContas */ }
    try {
      const s = await getDocs(collection(db, "pagamentos"));
      s.docs.forEach((d) => {
        const x = d.data(); const p = x.promotor;
        if (p && estadoAprovado(x.estado)) baseBy[p] = (baseBy[p] || 0) + (Number(x.valor) || 0);
      });
    } catch { /* sem regra de read em pagamentos */ }

    const novo: Record<string, Stats> = {};
    await Promise.all(promos.map(async (p) => {
      const leads = (leadsBy[p.codigo] || []).sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
      const clientes = clientesBy[p.codigo] || [];
      const comissao = Math.round((baseBy[p.codigo] || 0) * (pcts[p.codigo]) / 100);
      novo[p.codigo] = { leads: leads.length, clientes: clientes.length, comissao };
      try {
        await updateDoc(doc(db, "promotores", p.codigo), {
          stats: { leads: leads.length, clientes: clientes.length, comissao },
          leadsResumo: leads.slice(0, 100),
          clientesResumo: clientes.slice(0, 100),
          statsAtualizadoEm: serverTimestamp(),
        });
      } catch { /* */ }
    }));
    setStats(novo);
    setSincronizando(false);
    flash("Painéis dos promotores atualizados ✓");
  };

  // Cadastro direto pelo admin (cria promotor ativo + índice de email).
  const add = async () => {
    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();
    if (!nome) return flash("Indique o nome do promotor.");
    if (!email || !email.includes("@")) return flash("Indique o email Google do promotor (para o login).");
    const codigo = randomCode(existing);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "promotores", codigo), {
        nome, email, telefone: form.telefone.trim(), numeroMpesa: form.numeroMpesa.trim(),
        percentagem: COMISSAO_PADRAO, ativo: true, addedBy: user?.email || "", createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "promotorEmails", email), { codigo, criadoEm: serverTimestamp() });
      await batch.commit();
      setForm({ nome: "", email: "", telefone: "", numeroMpesa: "" });
      flash(`Promotor criado: ${codigo} ✓`);
      loadPromos();
    } catch { flash("Erro ao criar. Verifique as regras do Firestore."); }
  };

  const toggle = async (p: Promo) => {
    try { await updateDoc(doc(db, "promotores", p.codigo), { ativo: !(p.ativo !== false) }); loadPromos(); }
    catch { flash("Erro ao atualizar."); }
  };
  const remove = async (p: Promo) => {
    if (!confirm(`Remover o promotor ${p.codigo}? Os leads já atribuídos mantêm-se.`)) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "promotores", p.codigo));
      if (p.email) batch.delete(doc(db, "promotorEmails", p.email.toLowerCase()));
      await batch.commit();
      flash("Promotor removido."); loadPromos();
    } catch { flash("Erro ao remover."); }
  };

  const linkOf = (codigo: string) => `${window.location.origin}/p/${codigo}`;
  const conviteUrl = convite ? `${window.location.origin}/seja-promotor?c=${convite}` : "";
  const copyText = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); }
    catch { flash("Não foi possível copiar."); }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <h1 className={pageTitle}>Promotores</h1>
        {promos.length > 0 && (
          <button onClick={sincronizar} disabled={sincronizando} className="flex items-center gap-2 border border-line text-fg px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:border-accent/50 transition-colors disabled:opacity-50">
            <RefreshCcw size={14} className={sincronizando ? "animate-spin" : ""} /> {sincronizando ? "A atualizar…" : "Atualizar resultados"}
          </button>
        )}
      </div>
      <p className={pageSub}>Gere um link de cadastro de uso único para cada promotor, ou cadastre diretamente. Acompanhe leads, clientes e comissão (8% por pagamento recebido).</p>

      {/* Link de cadastro (uso único) */}
      <section className={card + " mb-6"}>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-faint mb-3"><Ticket size={14} /> Link de cadastro (uso único)</div>
        {convite ? (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <code className="flex-1 min-w-0 break-all text-fg text-sm">{conviteUrl}</code>
              <button onClick={() => copyText(conviteUrl, "convite")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors">
                {copied === "convite" ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
              </button>
            </div>
            <p className="text-faint text-xs">Envie a um único promotor. Quando ele se registar, este link deixa de funcionar. Para outro promotor, gere um novo.</p>
            <button onClick={gerarConvite} disabled={gerando} className="mt-4 text-[11px] font-mono uppercase tracking-widest text-muted hover:text-fg underline">Gerar outro link</button>
          </>
        ) : (
          <button onClick={gerarConvite} disabled={gerando} className="flex items-center gap-2 bg-fg text-bg px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
            <Ticket size={15} /> {gerando ? "A gerar…" : "Gerar link de cadastro"}
          </button>
        )}
      </section>

      {/* Cadastro direto */}
      <section className={card + " mb-6"}>
        {msg && <div className="mb-5 text-sm text-accent">{msg}</div>}
        <div className="text-[11px] font-mono uppercase tracking-widest text-faint mb-3">Cadastrar diretamente</div>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div><label className={label}>Nome *</label><input className={input} placeholder="Nome do promotor" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><label className={label}>Email Google * (login)</label><input className={input} placeholder="email@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className={label}>Telefone / WhatsApp</label><input className={input} placeholder="+258 8x xxx xxxx" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><label className={label}>Número M-Pesa (comissão)</label><input className={input} placeholder="Para receber a comissão" value={form.numeroMpesa} onChange={(e) => setForm({ ...form, numeroMpesa: e.target.value })} /></div>
        </div>
        <button onClick={add} className="flex items-center gap-2 bg-fg text-bg px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors">
          <UserPlus size={15} /> Criar promotor
        </button>
        <p className="text-faint text-xs mt-3">O promotor entra na sua área (<span className="font-mono">/promotor</span>) com esta conta Google.</p>
      </section>

      <div className="space-y-4">
        {promos.length === 0 && <p className="text-faint text-sm py-10 text-center">Ainda não há promotores.</p>}
        {promos.map((p) => {
          const ativo = p.ativo !== false;
          const pct = p.percentagem ?? COMISSAO_PADRAO;
          const s = stats[p.codigo] || { leads: 0, clientes: 0, comissao: 0 };
          return (
            <div key={p.codigo} className={`border bg-card p-5 md:p-6 ${ativo ? "border-line" : "border-line/40 opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-xl text-fg">{p.nome || "—"}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 bg-accent text-bg">{p.codigo}</span>
                    {!ativo && <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-line text-faint">inativo</span>}
                  </div>
                  <div className="text-faint text-xs font-mono">{p.email || "sem email"} · {pct}% · {p.telefone || p.whatsapp || "sem telefone"}{p.zona ? ` · ${p.zona}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyText(linkOf(p.codigo), p.codigo)} className="inline-flex items-center gap-2 px-3 py-2 border border-line text-fg font-mono text-[10px] uppercase tracking-widest hover:border-accent/50 transition-colors">
                    {copied === p.codigo ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}
                  </button>
                  <button onClick={() => toggle(p)} className="text-faint hover:text-accent p-2" title={ativo ? "Desativar" : "Ativar"}><Power size={16} /></button>
                  <button onClick={() => remove(p)} className="text-faint hover:text-accent p-2" title="Remover"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted mb-4 break-all">
                <Link2 size={13} className="shrink-0 text-faint" /> {linkOf(p.codigo)}
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-line text-center">
                <div><div className="font-display text-2xl text-fg">{s.leads}</div><div className="text-[10px] font-mono uppercase text-faint mt-1">Leads</div></div>
                <div><div className="font-display text-2xl text-fg">{s.clientes}</div><div className="text-[10px] font-mono uppercase text-faint mt-1">Clientes</div></div>
                <div><div className="font-display text-2xl text-accent">{s.comissao} <span className="text-sm text-muted">MT</span></div><div className="text-[10px] font-mono uppercase text-faint mt-1">Comissão</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
