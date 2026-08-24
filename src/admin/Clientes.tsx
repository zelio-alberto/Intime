import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { estadoPillCls } from "./gestaoUtils";
import { Search, User } from "lucide-react";
import FichaCliente from "./FichaCliente";

type Cli = { id: string } & DocumentData;

export default function Clientes() {
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Cli | null>(null);

  useEffect(() => {
    const u = onSnapshot(query(collection(db, "clientes"), orderBy("createdAt", "desc")),
      (s) => { setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  const lista = useMemo(() => clientes.filter((c) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return [c.nome, c.numeroConta, c.whatsapp, c.cidade, c.bairro, c.email, c.nomeEmpresa].some((v) => String(v || "").toLowerCase().includes(b));
  }), [clientes, busca]);

  const stats = [
    { label: "Clientes", value: clientes.length },
    { label: "Activos", value: clientes.filter((c) => String(c.estado || "").toLowerCase().includes("activ") || String(c.estado || "").toLowerCase().includes("ativ")).length, accent: true },
    { label: "Empresas", value: clientes.filter((c) => c.tipo === "empresa").length },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Clientes</h1>
      <p className="text-muted text-sm mb-8">Todos os clientes Intime. Toque numa linha para abrir a ficha comercial: dados, kits, extrato, dívidas, próximas faturas e contrato.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.accent ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-4xl leading-none mb-1 ${s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-5 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por nome, conta, WhatsApp, cidade…"
          className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[1.4fr_auto_1fr_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Nome</span><span>Conta</span><span>Local · contacto</span><span>Estado</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhum cliente.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((c) => (
              <button key={c.id} onClick={() => setSel(c)} className="w-full text-left grid md:grid-cols-[1.4fr_auto_1fr_auto] gap-2 md:gap-4 px-6 py-4 md:items-center hover:bg-card/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><User size={15} /></div>
                  <div className="min-w-0"><div className="text-fg font-medium truncate">{c.nome || "—"}</div><div className="text-faint text-xs truncate">{c.tipo === "empresa" ? (c.nomeEmpresa || "Empresa") : "Particular"}</div></div>
                </div>
                <div className="font-mono text-sm text-muted self-center">{c.numeroConta || "—"}</div>
                <div className="text-muted text-sm self-center truncate">{[c.bairro, c.cidade].filter(Boolean).join(", ") || "—"} · {c.whatsapp || "—"}</div>
                <span className={`justify-self-start md:justify-self-end text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border self-center ${estadoPillCls(String(c.estado || ""))}`}>{c.estado || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && <FichaCliente cli={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
