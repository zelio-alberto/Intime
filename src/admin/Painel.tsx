import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useConfig } from "./ConfigContext";
import { pageTitle } from "./ui";
import { Inbox, Mail, Boxes, ArrowRight } from "lucide-react";

function when(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}

export default function Painel() {
  const { cfg } = useConfig();
  const [reqs, setReqs] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "inscricoes"), (s) => setReqs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    const u2 = onSnapshot(collection(db, "mensagens"), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    return () => { u1(); u2(); };
  }, []);

  const novos = reqs.filter((r) => (r.status || "novo") === "novo").length;
  const recent = [...reqs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);

  const stats = [
    { label: "Pedidos novos", value: novos, to: "/admin/pedidos", icon: Inbox, accent: true },
    { label: "Total de pedidos", value: reqs.length, to: "/admin/pedidos", icon: Inbox },
    { label: "Mensagens", value: msgs.length, to: "/admin/mensagens", icon: Mail },
    { label: "Pacotes ativos", value: cfg.plans.length, to: "/admin/planos", icon: Boxes },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Painel</h1>
      <p className="text-muted text-sm mb-8">Visão geral da operação Intime.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className={`border p-6 transition-colors group ${s.accent && s.value > 0 ? "border-accent bg-accent/[0.05]" : "border-line hover:border-line/60 bg-card"}`}>
            <div className="flex items-center justify-between mb-4">
              <s.icon size={20} className={s.accent && s.value > 0 ? "text-accent" : "text-faint"} />
              <ArrowRight size={15} className="text-faint group-hover:text-fg transition-colors" />
            </div>
            <div className="font-display text-4xl text-fg leading-none mb-1">{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="border border-line bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-xl">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="font-mono text-[11px] uppercase tracking-widest text-accent hover:underline">Ver todos</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-faint text-sm px-6 py-10 text-center">Ainda não há pedidos.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="text-fg font-medium truncate">{r.nome || "—"} <span className="text-faint font-normal">· {r.plano || ""}</span></div>
                  <div className="text-xs text-faint">{[r.bairro, r.cidade].filter(Boolean).join(", ")} · {when(r.createdAt)}</div>
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 shrink-0 ${(r.status || "novo") === "novo" ? "bg-accent text-bg" : "border border-line text-faint"}`}>{r.status || "novo"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
