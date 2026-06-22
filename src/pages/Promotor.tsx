import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db, auth, googleProvider } from "../firebase";
import { doc, getDoc, Timestamp, type DocumentData } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { LogOut, Copy, Check, Link2, Users, UserCheck, Wallet, User as UserIcon } from "lucide-react";

/* ---------- estilos partilhados (mesmas classes do portal cliente) ---------- */
const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const btnPrimary = "w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const cardCls = "border border-line p-6 md:p-8 bg-card/30";

function fmtData(ts: unknown) {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return "";
}
const STATUS_LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Cliente" };

export default function Promotor() {
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [promo, setPromo] = useState<DocumentData | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  // Sessão Google partilhada: ao detetar utilizador, procura o promotor pelo email.
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setErro("");
      if (!u?.email) { setEmail(null); setPromo(null); setCodigo(null); setCarregando(false); return; }
      setEmail(u.email);
      try {
        const idx = await getDoc(doc(db, "promotorEmails", u.email.toLowerCase()));
        const cod = idx.exists() ? String(idx.data().codigo || "") : "";
        if (!cod) { setPromo(null); setCodigo(null); setCarregando(false); return; }
        const snap = await getDoc(doc(db, "promotores", cod));
        if (snap.exists()) { setCodigo(cod); setPromo({ codigo: cod, ...snap.data() }); }
        setCarregando(false);
      } catch { setErro("Erro ao carregar os seus dados. Tente de novo."); setCarregando(false); }
    });
  }, []);

  const entrarGoogle = async () => {
    setBusy(true); setErro("");
    try { await signInWithPopup(auth, googleProvider); }
    catch { setErro("Login Google indisponível. Tente de novo."); }
    finally { setBusy(false); }
  };
  const sair = () => { signOut(auth).catch(() => {}); };

  return (
    <Layout>
      <section className="pt-40 pb-24 min-h-screen">
        <div className="max-w-[820px] mx-auto px-6 lg:px-12">
          {carregando
            ? <p className="text-muted text-sm">A carregar…</p>
            : promo && codigo
              ? <Painel codigo={codigo} promo={promo} onLogout={sair} />
              : <Login onEntrar={entrarGoogle} busy={busy} erro={erro} email={email} onSair={sair} />}
        </div>
      </section>
    </Layout>
  );
}

/* ===================== LOGIN ===================== */
function Login({ onEntrar, busy, erro, email, onSair }: { onEntrar: () => void; busy: boolean; erro: string; email: string | null; onSair: () => void }) {
  return (
    <>
      <div className="mb-10">
        <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-5 block">Área do promotor</span>
        <h1 className="text-4xl md:text-6xl font-display font-medium text-fg tracking-tighter mb-4">Os meus resultados.</h1>
        <p className="text-lg text-muted font-light border-l border-line pl-6">
          Entre com a mesma conta Google que usou no cadastro para ver os clientes que trouxe e a sua comissão.
        </p>
      </div>

      <div className={cardCls}>
        {email ? (
          <>
            <p className="text-muted text-sm mb-1">Sessão iniciada como <span className="text-fg">{email}</span>.</p>
            <p className="text-[#ff6b6b] text-sm mb-5">Não encontrámos nenhuma conta de promotor para este email. Confirme que usou a conta Google do cadastro, ou fale com a Intime.</p>
            <button className={btnPrimary} onClick={onSair}>Trocar de conta</button>
          </>
        ) : (
          <>
            {erro && <p className="text-[#ff6b6b] text-sm mb-3">{erro}</p>}
            <button className={btnPrimary} disabled={busy} onClick={onEntrar}>
              <UserIcon size={15} /> {busy ? "A entrar…" : "Entrar com Google"}
            </button>
            <p className="text-center text-muted text-sm mt-6">
              Ainda não é promotor? <a href="/contacto" className="underline hover:text-fg">Fale com a equipa</a>.
            </p>
          </>
        )}
      </div>
    </>
  );
}

/* ===================== PAINEL ===================== */
function Painel({ codigo, promo, onLogout }: { codigo: string; promo: DocumentData; onLogout: () => void }) {
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
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* */ }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="font-display text-2xl text-fg">{promo.nome || "Promotor Intime"}</div>
          <div className="text-muted text-sm">Código <span className="font-mono text-fg">{codigo}</span> · {pct}% por pagamento</div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted hover:text-fg px-3 py-1.5 border border-line transition-colors">
          <LogOut size={13} /> Sair
        </button>
      </div>

      {/* o meu link */}
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

      {/* números */}
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

      {/* clientes ativos */}
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

      {/* leads */}
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
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-muted">{STATUS_LABEL[st] || st}</span>
                </div>
              );
            })}</div>}
      </div>
    </>
  );
}
