import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useSiteConfig } from "../useSiteConfig";
import { useAdminAuth } from "./useAdminAuth";
import { pageTitle, input, label } from "./ui";
import { MessageCircle, Trash2, MapPin, UserPlus, Plus, X } from "lucide-react";

type Req = { id: string; nome?: string; whatsapp?: string; email?: string; emailContacto?: string; criadoPorEmail?: string; plano?: string; cidade?: string; bairro?: string; tipo?: string; horario?: string; gps?: string; status?: string; createdAt?: any };

const STATUS = ["novo", "contactado", "concluido"];
const LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Concluído" };
const CLS: Record<string, string> = { novo: "bg-accent text-bg", contactado: "border border-line text-fg", concluido: "border border-line text-faint" };

function when(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}

const NOVO_VAZIO = { nome: "", whatsapp: "", email: "", planoId: "", cidade: "", bairro: "", gps: "", tipo: "Casa", horario: "Qualquer hora" };

export default function Pedidos() {
  const cfg = useSiteConfig();
  const { user } = useAdminAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [novo, setNovo] = useState({ ...NOVO_VAZIO });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "inscricoes"), (s) =>
      setReqs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))), () => {});
  }, []);

  const setStatus = (id: string, status: string) => updateDoc(doc(db, "inscricoes", id), { status }).catch(() => {});
  const remove = (id: string) => { if (confirm("Eliminar este pedido?")) deleteDoc(doc(db, "inscricoes", id)).catch(() => {}); };

  const setN = (k: string, v: string) => setNovo((f) => ({ ...f, [k]: v }));

  // Pedido criado pelo admin em nome do cliente: liga-se ao email do cliente
  // (é com ele que acompanha o estado em /conta) e regista quem o criou.
  const criarPedido = async (e: FormEvent) => {
    e.preventDefault();
    if (!novo.nome.trim() || !novo.whatsapp.trim()) { setErro("Nome e WhatsApp são obrigatórios."); return; }
    setSaving(true);
    setErro("");
    const plano = cfg.plans.find((p) => p.id === novo.planoId);
    const adminEmail = (user?.email || "").toLowerCase();
    const emailCliente = novo.email.trim().toLowerCase();
    try {
      await addDoc(collection(db, "inscricoes"), {
        nome: novo.nome.trim(), whatsapp: novo.whatsapp.trim(),
        email: emailCliente || adminEmail,
        cidade: novo.cidade.trim(), bairro: novo.bairro.trim(),
        tipo: novo.tipo, horario: novo.horario,
        ...(novo.gps.trim() ? { gps: novo.gps.trim() } : {}),
        ...(plano ? { plano: plano.name, planoId: plano.id } : {}),
        status: "novo",
        ...(user?.uid ? { uid: user.uid } : {}),
        ...(emailCliente && emailCliente !== adminEmail ? { criadoPorEmail: adminEmail } : {}),
        createdAt: serverTimestamp(),
      });
      setNovo({ ...NOVO_VAZIO });
      setShowForm(false);
    } catch {
      setErro("Não foi possível gravar o pedido. Verifique a ligação e tente de novo.");
    }
    setSaving(false);
  };

  const list = filter === "todos" ? reqs : reqs.filter((r) => (r.status || "novo") === filter);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Pedidos de instalação</h1>
          <p className="text-muted text-sm mb-6">{reqs.length} pedido(s) · contacte os clientes diretamente.</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setErro(""); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors">
          {showForm ? <><X size={14} /> Fechar</> : <><Plus size={14} /> Novo pedido</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={criarPedido} className="border border-line bg-card p-5 md:p-6 mb-6">
          <h2 className="font-display text-xl text-fg mb-1">Novo pedido em nome do cliente</h2>
          <p className="text-faint text-xs mb-5">O pedido fica ligado ao email do cliente — é com ele que acompanha o estado em “Entrar”. Sem email, fica ligado à sua conta.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 mb-5">
            <div><label className={label}>Nome completo *</label><input required className={input} value={novo.nome} onChange={(e) => setN("nome", e.target.value)} /></div>
            <div><label className={label}>WhatsApp *</label><input required className={input} value={novo.whatsapp} onChange={(e) => setN("whatsapp", e.target.value)} placeholder="+258 8x xxx xxxx" /></div>
            <div><label className={label}>Email do cliente</label><input type="email" className={input} value={novo.email} onChange={(e) => setN("email", e.target.value)} placeholder="cliente@email.com" /></div>
            <div>
              <label className={label}>Pacote</label>
              <select className={input} value={novo.planoId} onChange={(e) => setN("planoId", e.target.value)}>
                <option value="">— por definir —</option>
                {cfg.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className={label}>Cidade / Província</label><input className={input} value={novo.cidade} onChange={(e) => setN("cidade", e.target.value)} /></div>
            <div><label className={label}>Bairro</label><input className={input} value={novo.bairro} onChange={(e) => setN("bairro", e.target.value)} /></div>
            <div>
              <label className={label}>Tipo de espaço</label>
              <select className={input} value={novo.tipo} onChange={(e) => setN("tipo", e.target.value)}>
                <option>Casa</option><option>Loja</option><option>Escritório</option><option>Escola</option><option>Fazenda</option><option>Outro</option>
              </select>
            </div>
            <div>
              <label className={label}>Melhor horário</label>
              <select className={input} value={novo.horario} onChange={(e) => setN("horario", e.target.value)}>
                <option>Qualquer hora</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
              </select>
            </div>
            <div><label className={label}>GPS (opcional)</label><input className={input} value={novo.gps} onChange={(e) => setN("gps", e.target.value)} placeholder="-25.9xxx, 32.5xxx" /></div>
          </div>
          {erro && <p className="text-sm text-accent mb-4">{erro}</p>}
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors disabled:opacity-50">
            {saving ? "A gravar…" : "Criar pedido"}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-6">
        {["todos", ...STATUS].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`font-mono text-[11px] uppercase tracking-widest px-3 py-2 transition-colors ${filter === f ? "bg-fg text-bg" : "border border-line text-faint hover:text-fg"}`}>
            {f === "todos" ? "Todos" : LABEL[f]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.length === 0 && <p className="text-faint text-sm py-10 text-center">Sem pedidos {filter !== "todos" ? `(${LABEL[filter]})` : ""}.</p>}
        {list.map((r) => {
          const num = (r.whatsapp || "").replace(/\D/g, "");
          const st = r.status || "novo";
          return (
            <div key={r.id} className="border border-line bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-xl text-fg">{r.nome || "—"}</h3>
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 ${CLS[st]}`}>{LABEL[st]}</span>
                  </div>
                  <p className="text-faint text-xs font-mono">{when(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {st !== "concluido" && (
                    <Link to={`/admin/novo?lead=${r.id}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors"><UserPlus size={14} /> Converter</Link>
                  )}
                  <a href={`https://wa.me/${num}?text=${`Olá ${r.nome || ""}! Sou da equipa Intime, sobre o seu pedido do pacote ${r.plano || ""}.`}`} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-[#20bd5a] transition-colors"><MessageCircle size={14} /> WhatsApp</a>
                  <button onClick={() => remove(r.id)} className="text-faint hover:text-accent p-2" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-4">
                <div><span className="block text-[10px] font-mono uppercase text-faint">Pacote</span><span className="text-fg">{r.plano || "—"}</span></div>
                <div><span className="block text-[10px] font-mono uppercase text-faint">WhatsApp</span><span className="text-fg">{r.whatsapp || "—"}</span></div>
                <div>
                  <span className="block text-[10px] font-mono uppercase text-faint">Email</span>
                  <span className="text-fg break-all">{r.emailContacto || r.email || "—"}</span>
                  {r.criadoPorEmail && r.criadoPorEmail !== r.email && (
                    <span className="block text-[11px] text-faint break-all">criado por: {r.criadoPorEmail}</span>
                  )}
                </div>
                <div><span className="block text-[10px] font-mono uppercase text-faint">Local</span><span className="text-fg">{[r.bairro, r.cidade].filter(Boolean).join(", ") || "—"}</span></div>
                <div><span className="block text-[10px] font-mono uppercase text-faint">Espaço · Horário</span><span className="text-fg">{r.tipo || "—"} · {r.horario || "—"}</span></div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-line">
                {r.gps && <a href={`https://www.google.com/maps?q=${r.gps}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"><MapPin size={14} /> Ver no mapa</a>}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] font-mono uppercase text-faint">Estado:</span>
                  {STATUS.map((s) => (
                    <button key={s} onClick={() => setStatus(r.id, s)} className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 transition-colors ${st === s ? "bg-fg text-bg" : "border border-line text-faint hover:text-fg"}`}>{LABEL[s]}</button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
