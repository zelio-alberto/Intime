import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { db, auth, googleProvider } from "../firebase";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { CheckCircle2, Copy, Check, User as UserIcon, ShieldAlert } from "lucide-react";

const field = "w-full bg-bg border border-line px-4 py-3.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";
const btnPrimary = "w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
const cardCls = "border border-line p-6 md:p-8 bg-card/30";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let s = "PR";
  for (let j = 0; j < 5; j++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

type Estado = "validando" | "invalido" | "usado" | "ok";

export default function SejaPromotor() {
  const [params] = useSearchParams();
  const token = (params.get("c") || "").trim();

  const [estado, setEstado] = useState<Estado>("validando");
  const [user, setUser] = useState<User | null>(null);
  const [jaPromotor, setJaPromotor] = useState(false);
  const [codigoFeito, setCodigoFeito] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ nome: "", telefone: "", numeroMpesa: "", nomeMpesa: "", zona: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // 1) Validar o link (convite de uso único).
  useEffect(() => {
    (async () => {
      if (!token) { setEstado("invalido"); return; }
      try {
        const snap = await getDoc(doc(db, "promotorConvites", token));
        if (!snap.exists()) { setEstado("invalido"); return; }
        if (snap.data().usado) { setEstado("usado"); return; }
        setEstado("ok");
      } catch { setEstado("invalido"); }
    })();
  }, [token]);

  // 2) Sessão Google + verificar se já é promotor.
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u?.displayName && !form.nome) set("nome", u.displayName);
      if (u?.email) {
        try {
          const idx = await getDoc(doc(db, "promotorEmails", u.email.toLowerCase()));
          setJaPromotor(idx.exists());
        } catch { /* */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entrarGoogle = async () => {
    setBusy(true); setErro("");
    try { await signInWithPopup(auth, googleProvider); }
    catch { setErro("Login Google indisponível. Tente de novo."); }
    finally { setBusy(false); }
  };

  // 3) Submeter: cria o promotor (ativo), o índice de email e consome o convite.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!form.nome.trim() || !form.telefone.trim() || !form.numeroMpesa.trim()) {
      setErro("Preencha nome, telefone e número M-Pesa."); return;
    }
    setBusy(true); setErro("");
    try {
      const email = user.email.toLowerCase();
      const codigo = randomCode();
      const batch = writeBatch(db);
      batch.set(doc(db, "promotores", codigo), {
        nome: form.nome.trim(), email, telefone: form.telefone.trim(),
        numeroMpesa: form.numeroMpesa.trim(), nomeMpesa: form.nomeMpesa.trim(), zona: form.zona.trim(),
        percentagem: 8, ativo: true, convite: token, createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "promotorEmails", email), { codigo, criadoEm: serverTimestamp() });
      batch.update(doc(db, "promotorConvites", token), { usado: true, usadoPor: email, codigo, usadoEm: serverTimestamp() });
      await batch.commit();
      setCodigoFeito(codigo);
    } catch { setErro("Não foi possível concluir o cadastro. O link pode já ter sido usado."); }
    finally { setBusy(false); }
  };

  /* ---------- ecrãs ---------- */
  const wrap = (children: ReactNode) => (
    <Layout><section className="pt-40 pb-24 min-h-screen"><div className="max-w-[620px] mx-auto px-6">{children}</div></section></Layout>
  );

  if (estado === "validando") return wrap(<p className="text-muted text-sm">A validar o link…</p>);

  if (estado === "invalido" || estado === "usado") return wrap(
    <div className="text-center">
      <ShieldAlert size={48} className="text-[#ff6b6b] mx-auto mb-6" />
      <h1 className="font-display text-3xl text-fg mb-3">{estado === "usado" ? "Link já utilizado" : "Link inválido"}</h1>
      <p className="text-muted">{estado === "usado"
        ? "Este link de cadastro já foi usado para criar uma conta de promotor. Cada link só serve uma vez."
        : "Este link de cadastro não é válido. Peça um novo à equipa da Intime."}</p>
      <a href="/contacto" className="inline-block mt-8 underline text-fg hover:text-accent">Falar com a equipa</a>
    </div>
  );

  if (codigoFeito) {
    const link = `${window.location.origin}/p/${codigoFeito}`;
    return wrap(
      <div className="text-center">
        <CheckCircle2 size={56} className="text-accent mx-auto mb-7" />
        <h1 className="font-display text-4xl text-fg mb-4">Bem-vindo à equipa!</h1>
        <p className="text-muted mb-8">O seu cadastro está concluído e já está ativo. Este é o <b className="text-fg">seu link</b> — partilhe-o para começar a ganhar 8% por cada cliente.</p>
        <div className={cardCls + " text-left mb-8"}>
          <div className={lbl}>O meu link de promotor</div>
          <div className="flex flex-wrap items-center gap-3">
            <code className="flex-1 min-w-0 break-all text-fg text-sm">{link}</code>
            <button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ } }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors">
              {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
        </div>
        <a href="/promotor" className="inline-block underline text-fg hover:text-accent">Ir para a minha área de promotor</a>
      </div>
    );
  }

  // estado === "ok" → cadastro
  return wrap(
    <>
      <span className="font-mono text-accent text-[10px] uppercase tracking-[0.2em] mb-4 block">Cadastro de promotor</span>
      <h1 className="text-4xl md:text-5xl font-display font-medium text-fg tracking-tighter mb-3">Torne-se promotor Intime.</h1>
      <p className="text-muted mb-10">Ganhe 8% da mensalidade de cada cliente que trouxer, todos os meses. Registe-se em 1 minuto.</p>

      {!user ? (
        <div className={cardCls}>
          <p className="text-muted text-sm mb-5">Comece por entrar com a sua conta Google — é com ela que vai aceder à sua área de promotor.</p>
          {erro && <p className="text-[#ff6b6b] text-sm mb-3">{erro}</p>}
          <button className={btnPrimary} disabled={busy} onClick={entrarGoogle}><UserIcon size={15} /> {busy ? "A entrar…" : "Entrar com Google"}</button>
        </div>
      ) : jaPromotor ? (
        <div className={cardCls}>
          <p className="text-fg mb-3">Já existe uma conta de promotor para <b>{user.email}</b>.</p>
          <a href="/promotor" className="underline text-accent">Ir para a minha área</a>
        </div>
      ) : (
        <form onSubmit={submit} className={cardCls}>
          <p className="text-muted text-sm mb-6">Conta: <span className="text-fg">{user.email}</span></p>
          <div className="space-y-4">
            <div><label className={lbl}>Nome completo *</label><input className={field} value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
            <div><label className={lbl}>Telefone / WhatsApp *</label><input className={field} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="+258 8x xxx xxxx" /></div>
            <div><label className={lbl}>Número M-Pesa (para receber a comissão) *</label><input className={field} value={form.numeroMpesa} onChange={(e) => set("numeroMpesa", e.target.value)} /></div>
            <div><label className={lbl}>Nome registado na conta M-Pesa</label><input className={field} value={form.nomeMpesa} onChange={(e) => set("nomeMpesa", e.target.value)} placeholder="Se diferente do seu nome" /></div>
            <div><label className={lbl}>Zona / cidade onde atua</label><input className={field} value={form.zona} onChange={(e) => set("zona", e.target.value)} /></div>
          </div>
          {erro && <p className="text-[#ff6b6b] text-sm mt-4">{erro}</p>}
          <button type="submit" className={btnPrimary + " mt-6"} disabled={busy}>{busy ? "A concluir…" : "Concluir cadastro"}</button>
        </form>
      )}
    </>
  );
}
