import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { Trash2, MessageCircle } from "lucide-react";

type Msg = { id: string; nome?: string; contacto?: string; assunto?: string; mensagem?: string; createdAt?: any };

function when(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}

export default function Mensagens() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  useEffect(() => {
    return onSnapshot(collection(db, "mensagens"), (s) =>
      setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))), () => {});
  }, []);
  const remove = (id: string) => { if (confirm("Eliminar esta mensagem?")) deleteDoc(doc(db, "mensagens", id)).catch(() => {}); };

  return (
    <div>
      <h1 className={pageTitle}>Mensagens</h1>
      <p className="text-muted text-sm mb-6">{msgs.length} mensagem(ns) do formulário de contacto.</p>

      <div className="space-y-4">
        {msgs.length === 0 && <p className="text-faint text-sm py-10 text-center">Ainda não há mensagens.</p>}
        {msgs.map((m) => {
          const num = (m.contacto || "").replace(/\D/g, "");
          const isPhone = num.length >= 7;
          return (
            <div key={m.id} className="border border-line bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-display text-xl text-fg">{m.nome || "—"}</h3>
                  <p className="text-faint text-xs font-mono break-all">{m.contacto} · {when(m.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isPhone && <a href={`https://wa.me/${num}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-3 py-2 bg-[#25D366] text-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-[#20bd5a] transition-colors"><MessageCircle size={13} /> WhatsApp</a>}
                  <button onClick={() => remove(m.id)} className="text-faint hover:text-accent p-2" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              </div>
              {m.assunto && <p className="text-sm text-fg font-medium mb-1">{m.assunto}</p>}
              <p className="text-sm text-muted font-light whitespace-pre-line break-words">{m.mensagem}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
