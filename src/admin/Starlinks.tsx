import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, parseMoney, starlinkOf, margemMensal, kitAlocado, estadoPillCls } from "./gestaoUtils";
import { Search, Satellite } from "lucide-react";

type Kit = { id: string } & DocumentData;

export default function Starlinks() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "alocados" | "livres">("todos");

  useEffect(() => {
    const u = onSnapshot(collection(db, "kits"),
      (s) => { setKits(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  const lista = useMemo(() => kits.filter((k) => {
    const aloc = kitAlocado(k);
    if (filtro === "alocados" && !aloc) return false;
    if (filtro === "livres" && aloc) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return [k.cliente, k.conta, k.pacote, k.tipo, starlinkOf(k)?.accountId, starlinkOf(k)?.kitSerial].some((v) => String(v || "").toLowerCase().includes(b));
    }
    return true;
  }), [kits, busca, filtro]);

  const alocados = kits.filter(kitAlocado).length;
  const margemTotal = kits.reduce((s, k) => s + (kitAlocado(k) ? margemMensal(k) : 0), 0);
  const stats = [
    { label: "Kits", value: String(kits.length) },
    { label: "Alocados", value: String(alocados), accent: true },
    { label: "Livres", value: String(kits.length - alocados) },
    { label: "Margem/mês (alocados)", value: fmtMoney(margemTotal) },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Starlinks</h1>
      <p className="text-muted text-sm mb-8">Equipamentos Starlink, alocação a clientes e margem (mensalidade do cliente − custo da Starlink, lido do email).</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.accent ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-3xl leading-none mb-1 ${s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {([["todos", "Todos"], ["alocados", "Alocados"], ["livres", "Livres"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${filtro === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por cliente, conta, pacote, série…"
            className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      <div className="border border-line bg-card">
        <div className="hidden lg:grid grid-cols-[1.3fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Cliente / Conta</span><span>Pacote</span><span>Mensalidade</span><span>Custo / Margem</span><span>Estado</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhum kit.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((k) => {
              const sl = starlinkOf(k);
              const margem = margemMensal(k);
              const aloc = kitAlocado(k);
              return (
                <div key={k.id} className="grid lg:grid-cols-[1.3fr_1fr_auto_auto_auto] gap-2 lg:gap-4 px-6 py-4 lg:items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><Satellite size={15} /></div>
                    <div className="min-w-0"><div className="text-fg font-medium truncate">{k.cliente || "— livre —"}</div><div className="text-faint text-xs truncate">{sl?.accountId || k.conta || k.tipo || "—"}</div></div>
                  </div>
                  <div className="text-muted text-sm self-center truncate">{k.pacote || "—"}</div>
                  <div className="text-fg text-sm self-center">{k.mensalidade ? fmtMoney(parseMoney(k.mensalidade)) : "—"}</div>
                  <div className="self-center text-sm">
                    <div className="text-muted">{sl?.amount ? String(sl.amount) : "—"}</div>
                    {aloc && <div className={margem >= 0 ? "text-accent" : "text-[#ff6b6b]"}>{margem >= 0 ? "+" : ""}{fmtMoney(margem)}</div>}
                  </div>
                  <span className={`justify-self-start lg:justify-self-end text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border self-center ${estadoPillCls(String(k.estado || (aloc ? "Alugado" : "Livre")))}`}>{k.estado || (aloc ? "Alugado" : "Livre")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
