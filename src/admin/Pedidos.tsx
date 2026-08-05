import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { MessageCircle, Trash2, MapPin, UserPlus } from "lucide-react";

type Req = { id: string; nome?: string; whatsapp?: string; email?: string; emailContacto?: string; criadoPorEmail?: string; plano?: string; cidade?: string; bairro?: string; tipo?: string; horario?: string; gps?: string; status?: string; createdAt?: any };

const STATUS = ["novo", "contactado", "concluido"];
const LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Concluído" };
const CLS: Record<string, string> = { novo: "bg-accent text-bg", contactado: "border border-line text-fg", concluido: "border border-line text-faint" };

function when(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}

export default function Pedidos() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    return onSnapshot(collection(db, "inscricoes"), (s) =>
      setReqs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))), () => {});
  }, []);

  const setStatus = (id: string, status: string) => updateDoc(doc(db, "inscricoes", id), { status }).catch(() => {});
  const remove = (id: string) => { if (confirm("Eliminar este pedido?")) deleteDoc(doc(db, "inscricoes", id)).catch(() => {}); };

  const list = filter === "todos" ? reqs : reqs.filter((r) => (r.status || "novo") === filter);

  return (
    <div>
      <h1 className={pageTitle}>Pedidos de instalação</h1>
      <p className="text-muted text-sm mb-6">{reqs.length} pedido(s) · contacte os clientes diretamente.</p>

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
