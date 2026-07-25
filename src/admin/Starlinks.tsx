import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, parseMoney, starlinkOf, margemMensal, kitAlocado, estadoPillCls, logMov } from "./gestaoUtils";
import { Search, Satellite, Pencil, Check, X } from "lucide-react";

type Kit = { id: string } & DocumentData;

export default function Starlinks() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "alocados" | "livres">("todos");
  const [editCusto, setEditCusto] = useState<string | null>(null);
  const [custoVal, setCustoVal] = useState("");

  // O custo de compra do kit alimenta o Masterfile (investimento) — edita-se aqui.
  const guardarCusto = async (k: Kit) => {
    const v = parseMoney(custoVal);
    try {
      await updateDoc(doc(db, "kits", k.id), { custoAquisicao: String(v || ""), updatedAt: serverTimestamp() });
      await logMov("estado", `Custo de aquisição do kit ${k.cliente || k.conta || k.id} → ${fmtMoney(v)}`, { kitId: k.id, valor: v });
    } catch { /* */ }
    setEditCusto(null);
  };

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
                    {editCusto === k.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input autoFocus value={custoVal} onChange={(e) => setCustoVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") guardarCusto(k); if (e.key === "Escape") setEditCusto(null); }}
                          inputMode="decimal" placeholder="14290" className="w-24 bg-bg border border-line px-2 py-1 text-xs text-fg outline-none focus:border-accent" />
                        <button onClick={() => guardarCusto(k)} className="w-6 h-6 grid place-items-center border border-line text-accent hover:bg-fg/10"><Check size={12} /></button>
                        <button onClick={() => setEditCusto(null)} className="w-6 h-6 grid place-items-center border border-line text-muted hover:text-fg"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditCusto(k.id); setCustoVal(String(parseMoney(k.custoAquisicao) || "")); }}
                        className="flex items-center gap-1 text-faint text-xs mt-1 hover:text-fg transition-colors" title="Custo de compra do kit (investimento no Masterfile)">
                        Compra: {k.custoAquisicao ? fmtMoney(parseMoney(k.custoAquisicao)) : "—"} <Pencil size={10} />
                      </button>
                    )}
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
