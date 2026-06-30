import { useEffect, useMemo, useState, type DocumentData } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, parseMoney, fmtDateTime, estadoPillCls } from "./gestaoUtils";
import { Search, FileText, ExternalLink } from "lucide-react";

type Ct = { id: string } & DocumentData;

export default function Contratos() {
  const [cts, setCts] = useState<Ct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const u = onSnapshot(query(collection(db, "contratos"), orderBy("createdAt", "desc"), limit(500)),
      (s) => { setCts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  const lista = useMemo(() => cts.filter((c) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return [c.numero, c.numeroConta, c.pacote, c.tipo].some((v) => String(v || "").toLowerCase().includes(b));
  }), [cts, busca]);

  return (
    <div>
      <h1 className={pageTitle}>Contratos</h1>
      <p className="text-muted text-sm mb-8">Contratos gerados no cadastro. {cts.length} no total.</p>

      <div className="relative mb-5 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por nº de contrato, conta, pacote…"
          className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr_auto_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Contrato</span><span>Conta</span><span>Pacote</span><span>Mensalidade</span><span>Estado</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Sem contratos.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((c) => {
              const url = c.pdfUrl || c.contratoUrl || c.url;
              return (
                <div key={c.id} className="grid md:grid-cols-[1fr_auto_1fr_auto_auto] gap-2 md:gap-4 px-6 py-4 md:items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><FileText size={15} /></div>
                    <div className="min-w-0">
                      <div className="text-fg font-medium truncate">{c.numero || "—"}</div>
                      <div className="text-faint text-xs">{c.dataInicio || fmtDateTime(c.createdAt)}</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-muted self-center">{c.numeroConta || "—"}</div>
                  <div className="text-muted text-sm self-center truncate">{c.pacote || "—"}</div>
                  <div className="text-fg text-sm self-center">{c.mensalidade ? fmtMoney(parseMoney(c.mensalidade)) : "—"}</div>
                  <div className="self-center flex items-center gap-3 justify-self-start md:justify-self-end">
                    {url && <a href={String(url)} target="_blank" rel="noopener" className="text-accent hover:text-fg" title="Abrir PDF"><ExternalLink size={15} /></a>}
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border ${estadoPillCls(String(c.estado || ""))}`}>{c.estado || "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
