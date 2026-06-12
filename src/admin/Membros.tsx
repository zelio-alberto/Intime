import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, MASTER_ADMIN } from "../firebase";
import { useAdminAuth } from "./useAdminAuth";
import { input, card, pageTitle, pageSub } from "./ui";
import { UserPlus, Trash2 } from "lucide-react";

export default function Membros() {
  const { user, isMaster } = useAdminAuth();
  const [members, setMembers] = useState<string[]>([]);
  const [novo, setNovo] = useState("");
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const load = async () => { try { const s = await getDocs(collection(db, "starlinkAdmins")); setMembers(s.docs.map((d) => d.id)); } catch { /* */ } };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const email = novo.trim().toLowerCase();
    if (!email || !email.includes("@")) return flash("Email inválido");
    try { await setDoc(doc(db, "starlinkAdmins", email), { role: "admin", addedBy: user?.email, addedAt: serverTimestamp() }); setNovo(""); flash("Membro adicionado ✓"); load(); }
    catch { flash("Erro: só o admin principal pode gerir membros."); }
  };
  const remove = async (email: string) => {
    if (email === MASTER_ADMIN || !confirm(`Remover ${email}?`)) return;
    try { await deleteDoc(doc(db, "starlinkAdmins", email)); flash("Membro removido"); load(); }
    catch { flash("Erro ao remover."); }
  };

  return (
    <div>
      <h1 className={pageTitle}>Membros da equipa</h1>
      <p className={pageSub}>{isMaster ? "Adicione ou remova administradores. Só o admin principal pode gerir." : "Apenas o admin principal pode gerir membros."}</p>

      <section className={card}>
        {msg && <div className="mb-5 text-sm text-accent">{msg}</div>}
        {isMaster && (
          <div className="flex gap-3 mb-6">
            <input className={input} placeholder="email@exemplo.com" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <button onClick={add} className="flex items-center gap-2 bg-fg text-bg px-5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors whitespace-nowrap"><UserPlus size={15} /> Adicionar</button>
          </div>
        )}
        <div className="divide-y divide-[var(--line)]">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm">{MASTER_ADMIN} <span className="text-accent text-xs ml-2">(principal)</span></span>
          </div>
          {members.filter((m) => m !== MASTER_ADMIN).map((m) => (
            <div key={m} className="flex items-center justify-between py-3">
              <span className="text-sm">{m}</span>
              {isMaster && <button onClick={() => remove(m)} className="text-faint hover:text-accent" title="Remover"><Trash2 size={16} /></button>}
            </div>
          ))}
          {members.filter((m) => m !== MASTER_ADMIN).length === 0 && <p className="text-faint text-sm py-3">Sem membros adicionais.</p>}
        </div>
      </section>
    </div>
  );
}
