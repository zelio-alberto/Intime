import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { getDoc, setDoc, collection, getDocs, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, MASTER_ADMIN } from "../firebase";
import { CONFIG_REF, DEFAULT_CONFIG, type SiteConfig, type Plan } from "../useSiteConfig";
import { useAdminAuth } from "./useAdminAuth";
import { Save, Plus, Trash2, LogOut, UserPlus, Loader2, Inbox } from "lucide-react";

const input = "w-full bg-bg border border-line px-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors";
const label = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-1.5";
const card = "border border-line bg-card p-6 md:p-8";

export default function Admin() {
  const nav = useNavigate();
  const { user, authorized, loading, isMaster } = useAdminAuth();

  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || authorized === false)) nav("/admin/login");
  }, [user, authorized, loading, nav]);

  useEffect(() => {
    if (authorized) {
      getDoc(CONFIG_REF())
        .then((s) => { if (s.exists()) setCfg({ ...DEFAULT_CONFIG, ...(s.data() as SiteConfig) }); })
        .catch(() => {});
      loadMembers();
    }
  }, [authorized]);

  const loadMembers = async () => {
    try {
      const snap = await getDocs(collection(db, "starlinkAdmins"));
      setMembers(snap.docs.map((d) => d.id));
    } catch { /* sem acesso */ }
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(CONFIG_REF(), cfg, { merge: true });
      flash("Guardado com sucesso ✓");
    } catch {
      flash("Erro ao guardar — verifique as regras do Firestore.");
    }
    setSaving(false);
  };

  const addMember = async () => {
    const email = newMember.trim().toLowerCase();
    if (!email || !email.includes("@")) return flash("Email inválido");
    try {
      await setDoc(doc(db, "starlinkAdmins", email), { role: "admin", addedBy: user?.email, addedAt: serverTimestamp() });
      setNewMember("");
      flash("Membro adicionado ✓");
      loadMembers();
    } catch { flash("Erro: só o admin principal pode gerir membros."); }
  };

  const removeMember = async (email: string) => {
    if (email === MASTER_ADMIN) return;
    if (!confirm(`Remover ${email}?`)) return;
    try { await deleteDoc(doc(db, "starlinkAdmins", email)); flash("Membro removido"); loadMembers(); }
    catch { flash("Erro ao remover membro."); }
  };

  const setPlan = (i: number, patch: Partial<Plan>) =>
    setCfg((c) => ({ ...c, plans: c.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const addPlan = () =>
    setCfg((c) => ({ ...c, plans: [...c.plans, { id: "plano-" + (c.plans.length + 1), name: "Novo pacote", tagline: "", idealFor: "", equipment: "", price: "0", unit: "MT / mês", from: true, features: [], featured: false }] }));
  const removePlan = (i: number) =>
    setCfg((c) => ({ ...c, plans: c.plans.filter((_, idx) => idx !== i) }));

  if (loading || !authorized) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl">
            <img src="/logo-intime.png" alt="Intime" className="logo-img w-8 h-8" />
            <span>Gestão</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/admin/pedidos" className="flex items-center gap-2 px-4 py-2.5 border border-line font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors"><Inbox size={14} /> Pedidos</Link>
            <span className="hidden md:block text-xs text-faint">{user?.email}</span>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-fg text-bg px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
            </button>
            <button onClick={() => signOut(auth)} className="text-faint hover:text-fg transition-colors" title="Sair"><LogOut size={18} /></button>
          </div>
        </div>
        {msg && <div className="bg-accent text-bg text-center text-sm py-2 font-medium">{msg}</div>}
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
        {/* CONTACTOS */}
        <section className={card}>
          <h2 className="font-display text-2xl mb-6">Contactos</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div><label className={label}>Email</label><input className={input} value={cfg.contacts.email} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, email: e.target.value } })} /></div>
            <div><label className={label}>WhatsApp (só números)</label><input className={input} value={cfg.contacts.whatsapp} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, whatsapp: e.target.value } })} /></div>
            <div><label className={label}>Telefone (visível)</label><input className={input} value={cfg.contacts.phone} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, phone: e.target.value } })} /></div>
          </div>
        </section>

        {/* HERO / PREÇO DESTAQUE */}
        <section className={card}>
          <h2 className="font-display text-2xl mb-6">Preço em destaque (hero)</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div><label className={label}>Texto</label><input className={input} value={cfg.hero.priceLabel} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, priceLabel: e.target.value } })} /></div>
            <div><label className={label}>Valor</label><input className={input} value={cfg.hero.price} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, price: e.target.value } })} /></div>
            <div><label className={label}>Unidade</label><input className={input} value={cfg.hero.unit} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, unit: e.target.value } })} /></div>
          </div>
        </section>

        {/* PLANOS */}
        <section className={card}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl">Planos</h2>
            <button onClick={addPlan} className="flex items-center gap-2 border border-line px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors"><Plus size={14} /> Plano</button>
          </div>
          <div className="space-y-6">
            {cfg.plans.map((p, i) => (
              <div key={i} className="border border-line p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-faint uppercase tracking-widest">Plano {i + 1}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                      <input type="checkbox" checked={!!p.from} onChange={(e) => setPlan(i, { from: e.target.checked })} /> A partir de
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                      <input type="checkbox" checked={!!p.featured} onChange={(e) => setPlan(i, { featured: e.target.checked })} /> Destaque
                    </label>
                    <button onClick={() => removePlan(i)} className="text-faint hover:text-accent" title="Remover"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div><label className={label}>Nome</label><input className={input} value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} /></div>
                  <div><label className={label}>Ideal para</label><input className={input} value={p.idealFor} onChange={(e) => setPlan(i, { idealFor: e.target.value })} /></div>
                  <div className="md:col-span-2"><label className={label}>Equipamento incluído</label><input className={input} value={p.equipment} onChange={(e) => setPlan(i, { equipment: e.target.value })} /></div>
                  <div><label className={label}>Mensalidade (valor)</label><input className={input} value={p.price} onChange={(e) => setPlan(i, { price: e.target.value })} /></div>
                  <div><label className={label}>Unidade</label><input className={input} value={p.unit} onChange={(e) => setPlan(i, { unit: e.target.value })} /></div>
                </div>
                <div className="mb-4"><label className={label}>Descrição curta</label><input className={input} value={p.tagline} onChange={(e) => setPlan(i, { tagline: e.target.value })} /></div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div><label className={label}>Imagem (ex: /produtos/mini.png)</label><input className={input} value={p.image || ""} onChange={(e) => setPlan(i, { image: e.target.value })} /></div>
                  <div><label className={label}>Velocidade</label><input className={input} value={p.speedDetail || ""} onChange={(e) => setPlan(i, { speedDetail: e.target.value })} /></div>
                  <div><label className={label}>Wi-Fi (dispositivos / cobertura)</label><input className={input} value={p.wifiInfo || ""} onChange={(e) => setPlan(i, { wifiInfo: e.target.value })} /></div>
                  <div><label className={label}>Por cabo (Ethernet)</label><input className={input} value={p.wiredInfo || ""} onChange={(e) => setPlan(i, { wiredInfo: e.target.value })} /></div>
                </div>
                <div><label className={label}>Características (uma por linha)</label>
                  <textarea className={input + " min-h-[110px] resize-y font-mono text-[13px]"} value={p.features.join("\n")} onChange={(e) => setPlan(i, { features: e.target.value.split("\n").filter(Boolean) })} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTRATO */}
        <section className={card}>
          <h2 className="font-display text-2xl mb-2">Termo de compromisso (contrato)</h2>
          <p className="text-muted text-sm mb-5">Este texto aparece na página de adesão. Reveja juridicamente antes de usar.</p>
          <textarea
            className={input + " min-h-[260px] resize-y text-[13px] leading-relaxed"}
            value={cfg.contract}
            onChange={(e) => setCfg({ ...cfg, contract: e.target.value })}
          />
        </section>

        {/* MEMBROS */}
        <section className={card}>
          <h2 className="font-display text-2xl mb-2">Membros da gestão</h2>
          <p className="text-muted text-sm mb-6">{isMaster ? "Adicione ou remova administradores (apenas o admin principal pode gerir)." : "Apenas o admin principal pode gerir membros."}</p>
          {isMaster && (
            <div className="flex gap-3 mb-6">
              <input className={input} placeholder="email@exemplo.com" value={newMember} onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} />
              <button onClick={addMember} className="flex items-center gap-2 bg-fg text-bg px-5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors whitespace-nowrap"><UserPlus size={15} /> Adicionar</button>
            </div>
          )}
          <div className="divide-y divide-[var(--line)]">
            {members.length === 0 && <p className="text-faint text-sm py-3">Sem membros adicionais (apenas o admin principal).</p>}
            {members.map((m) => (
              <div key={m} className="flex items-center justify-between py-3">
                <span className="text-sm">{m} {m === MASTER_ADMIN && <span className="text-accent text-xs ml-2">(principal)</span>}</span>
                {isMaster && m !== MASTER_ADMIN && (
                  <button onClick={() => removeMember(m)} className="text-faint hover:text-accent" title="Remover"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
