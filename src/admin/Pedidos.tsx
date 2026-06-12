import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { LogOut, Loader2, Settings, MessageCircle, Trash2, MapPin, Inbox, Mail } from "lucide-react";

type Req = { id: string; nome?: string; whatsapp?: string; plano?: string; cidade?: string; bairro?: string; tipo?: string; horario?: string; gps?: string; status?: string; createdAt?: any };
type Msg = { id: string; nome?: string; contacto?: string; assunto?: string; mensagem?: string; status?: string; createdAt?: any };

const STATUS = ["novo", "contactado", "concluido"];
const STATUS_LABEL: Record<string, string> = { novo: "Novo", contactado: "Contactado", concluido: "Concluído" };
const STATUS_CLS: Record<string, string> = { novo: "bg-accent text-bg", contactado: "border border-line text-fg", concluido: "border border-line text-faint" };

function when(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}
function bySort(a: any, b: any) { return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); }

export default function Pedidos() {
  const nav = useNavigate();
  const { user, authorized, loading } = useAdminAuth();
  const [tab, setTab] = useState<"pedidos" | "mensagens">("pedidos");
  const [reqs, setReqs] = useState<Req[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);

  useEffect(() => { if (!loading && (!user || authorized === false)) nav("/admin/login"); }, [user, authorized, loading, nav]);

  useEffect(() => {
    if (!authorized) return;
    const u1 = onSnapshot(collection(db, "inscricoes"), (s) => setReqs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort(bySort)), () => {});
    const u2 = onSnapshot(collection(db, "mensagens"), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort(bySort)), () => {});
    return () => { u1(); u2(); };
  }, [authorized]);

  const setStatus = (col: string, id: string, status: string) => updateDoc(doc(db, col, id), { status }).catch(() => {});
  const remove = (col: string, id: string) => { if (confirm("Eliminar este registo?")) deleteDoc(doc(db, col, id)).catch(() => {}); };

  if (loading || !authorized) return <div className="min-h-screen grid place-items-center bg-bg text-muted"><Loader2 className="animate-spin" /></div>;

  const novos = reqs.filter((r) => (r.status || "novo") === "novo").length;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl">
            <img src="/logo-intime.png" alt="Intime" className="logo-img w-8 h-8" /><span>Gestão</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 border border-line font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors"><Settings size={14} /> Configuração</Link>
            <span className="hidden sm:block text-xs text-faint">{user?.email}</span>
            <button onClick={() => signOut(auth)} className="text-faint hover:text-fg transition-colors" title="Sair"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="font-display text-3xl mb-6">Pedidos</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-line">
          <button onClick={() => setTab("pedidos")} className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] -mb-px border-b-2 transition-colors flex items-center gap-2 ${tab === "pedidos" ? "border-accent text-fg" : "border-transparent text-faint hover:text-fg"}`}>
            <Inbox size={14} /> Instalações ({reqs.length}){novos > 0 && <span className="bg-accent text-bg text-[10px] px-1.5 rounded-full">{novos}</span>}
          </button>
          <button onClick={() => setTab("mensagens")} className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] -mb-px border-b-2 transition-colors flex items-center gap-2 ${tab === "mensagens" ? "border-accent text-fg" : "border-transparent text-faint hover:text-fg"}`}>
            <Mail size={14} /> Mensagens ({msgs.length})
          </button>
        </div>

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div className="space-y-4">
            {reqs.length === 0 && <p className="text-faint text-sm py-10 text-center">Ainda não há pedidos de instalação.</p>}
            {reqs.map((r) => {
              const num = (r.whatsapp || "").replace(/\D/g, "");
              const st = r.status || "novo";
              return (
                <div key={r.id} className="border border-line p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-xl text-fg">{r.nome || "—"}</h3>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 ${STATUS_CLS[st]}`}>{STATUS_LABEL[st]}</span>
                      </div>
                      <p className="text-faint text-xs font-mono">{when(r.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`https://wa.me/${num}?text=${`Olá ${r.nome || ""}! Sou da equipa Intime, sobre o seu pedido do pacote ${r.plano || ""}.`}`} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-[#20bd5a] transition-colors"><MessageCircle size={14} /> WhatsApp</a>
                      <button onClick={() => remove("inscricoes", r.id)} className="text-faint hover:text-accent p-2" title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-4">
                    <div><span className="block text-[10px] font-mono uppercase text-faint">Pacote</span><span className="text-fg">{r.plano || "—"}</span></div>
                    <div><span className="block text-[10px] font-mono uppercase text-faint">WhatsApp</span><span className="text-fg">{r.whatsapp || "—"}</span></div>
                    <div><span className="block text-[10px] font-mono uppercase text-faint">Local</span><span className="text-fg">{[r.bairro, r.cidade].filter(Boolean).join(", ") || "—"}</span></div>
                    <div><span className="block text-[10px] font-mono uppercase text-faint">Espaço · Horário</span><span className="text-fg">{r.tipo || "—"} · {r.horario || "—"}</span></div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-line">
                    {r.gps && <a href={`https://www.google.com/maps?q=${r.gps}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors"><MapPin size={14} /> Ver no mapa</a>}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] font-mono uppercase text-faint">Estado:</span>
                      {STATUS.map((s) => (
                        <button key={s} onClick={() => setStatus("inscricoes", r.id, s)}
                          className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 transition-colors ${st === s ? "bg-fg text-bg" : "border border-line text-faint hover:text-fg"}`}>{STATUS_LABEL[s]}</button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MENSAGENS */}
        {tab === "mensagens" && (
          <div className="space-y-4">
            {msgs.length === 0 && <p className="text-faint text-sm py-10 text-center">Ainda não há mensagens.</p>}
            {msgs.map((m) => (
              <div key={m.id} className="border border-line p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-xl text-fg">{m.nome || "—"}</h3>
                    <p className="text-faint text-xs font-mono">{m.contacto} · {when(m.createdAt)}</p>
                  </div>
                  <button onClick={() => remove("mensagens", m.id)} className="text-faint hover:text-accent p-2" title="Eliminar"><Trash2 size={16} /></button>
                </div>
                {m.assunto && <p className="text-sm text-fg font-medium mb-1">{m.assunto}</p>}
                <p className="text-sm text-muted font-light whitespace-pre-line">{m.mensagem}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
