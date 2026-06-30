import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, fmtDateTime } from "./gestaoUtils";
import { Search, Receipt, Satellite, User, FileText, Activity, Wifi } from "lucide-react";

type Mov = { id: string } & DocumentData;

const TIPOS: Record<string, { label: string; icon: typeof Receipt; color: string }> = {
  pagamento: { label: "Pagamento", icon: Receipt, color: "var(--accent,#00E5FF)" },
  alocacao: { label: "Alocação", icon: Satellite, color: "#f5b948" },
  estado: { label: "Estado", icon: Activity, color: "#9b8cff" },
  starlink: { label: "Starlink", icon: Wifi, color: "#00E5FF" },
  cliente: { label: "Cliente", icon: User, color: "#5cf2c8" },
  contrato: { label: "Contrato", icon: FileText, color: "#ff9f6b" },
};

export default function Historico() {
  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");

  useEffect(() => {
    const u = onSnapshot(query(collection(db, "movimentos"), orderBy("at", "desc"), limit(500)),
      (s) => { setMovs(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  const lista = useMemo(() => movs.filter((m) => {
    if (tipo !== "todos" && m.tipo !== tipo) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return [m.descricao, m.by, m.tipo].some((v) => String(v || "").toLowerCase().includes(b));
    }
    return true;
  }), [movs, busca, tipo]);

  return (
    <div>
      <h1 className={pageTitle}>Histórico</h1>
      <p className="text-muted text-sm mb-8">Livro central de movimentos (pagamentos, alocações, estados, cadastros, contratos) — quem fez e quando.</p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 flex-wrap">
          {["todos", ...Object.keys(TIPOS)].map((t) => (
            <button key={t} onClick={() => setTipo(t)} className={`px-3.5 py-2 text-xs font-mono uppercase tracking-[0.12em] border transition-colors ${tipo === t ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>
              {t === "todos" ? "Todos" : TIPOS[t].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar na descrição ou autor…"
            className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      <div className="border border-line bg-card">
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Sem movimentos.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((m) => {
              const t = TIPOS[m.tipo] || { label: m.tipo || "—", icon: Activity, color: "#888" };
              const Icon = t.icon;
              const valor = Number(m.valor) || 0;
              return (
                <div key={m.id} className="flex items-start gap-4 px-6 py-3.5">
                  <div className="w-9 h-9 grid place-items-center border border-line shrink-0" style={{ color: t.color }}><Icon size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-fg text-sm">{m.descricao || "—"}</div>
                    <div className="text-faint text-xs mt-0.5">{t.label}{m.by ? ` · ${m.by}` : ""} · {fmtDateTime(m.at)}</div>
                  </div>
                  {valor > 0 && <div className="text-accent text-sm font-medium shrink-0 self-center">{fmtMoney(valor)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
