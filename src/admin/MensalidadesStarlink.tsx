import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { Satellite, Check, AlertTriangle, Search, BadgeCheck } from "lucide-react";

type Kit = { id: string } & Record<string, any>;

function monthKey() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; }
function amountToNumber(s: any): number {
  const m = String(s || "").replace(/[^\d.,]/g, "");
  return parseFloat(m.replace(/\./g, "").replace(",", ".")) || 0;
}
function pagoEsteMes(k: Kit): boolean {
  const st = String(k.starlink?.status || "").toLowerCase();
  if (st.includes("pago") || st.includes("ativ")) return true;
  return k.starlinkPago?.mes === monthKey();
}

export default function MensalidadesStarlink() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"apagar" | "pagos" | "todos">("apagar");
  const [busca, setBusca] = useState("");
  const [marcando, setMarcando] = useState<string | null>(null);

  useEffect(() => {
    const u = onSnapshot(collection(db, "kits"),
      (s) => { setKits(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  // só kits com serviço Starlink (têm dados de email/fatura)
  const comServico = useMemo(() => kits.filter((k) => k.starlink && (k.starlink.amount || k.starlink.product || k.starlink.accountId)), [kits]);

  const enriched = comServico.map((k) => ({ ...k, _pago: pagoEsteMes(k), _valor: amountToNumber(k.starlink?.amount) }));
  const aPagar = enriched.filter((k) => !k._pago);
  const totalAPagar = aPagar.reduce((s, k) => s + k._valor, 0);

  const lista = enriched.filter((k) => {
    if (filtro === "apagar" && k._pago) return false;
    if (filtro === "pagos" && !k._pago) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return [k.starlink?.accountId, k.starlink?.product, k.conta, k.nome, k.numeroConta, k.cliente].some((v) => String(v || "").toLowerCase().includes(b));
    }
    return true;
  });

  const marcarPago = async (k: Kit) => {
    setMarcando(k.id);
    try {
      await setDoc(doc(db, "kits", k.id), { starlinkPago: { mes: monthKey(), em: serverTimestamp(), manual: true } }, { merge: true });
    } catch { /* */ }
    finally { setMarcando(null); }
  };

  const stats = [
    { label: "Kits com serviço", value: comServico.length },
    { label: "Por pagar à Starlink", value: aPagar.length, alerta: aPagar.length > 0 },
    { label: "Total a pagar (MZN)", value: totalAPagar.toLocaleString("pt-PT"), accent: true },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Mensalidades Starlink</h1>
      <p className="text-muted text-sm mb-3">Os pagamentos que a Intime deve fazer à Starlink por cada kit ativo. O estado vem do leitor de emails da Starlink; pode marcar como pago manualmente.</p>
      <div className="border border-line bg-card/40 px-4 py-3 text-xs text-muted mb-8 flex items-start gap-2">
        <AlertTriangle size={15} className="text-faint shrink-0 mt-0.5" />
        A verificação automática (leitor de emails) corre no servidor de gestão. Enquanto não estiver no ar, use “Marcar como pago”; quando o leitor confirmar, o estado passa a <b className="text-fg">Pago</b> sozinho.
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.alerta ? "border-[#ff6b6b]/50 bg-[#ff6b6b]/[0.05]" : s.accent ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-4xl leading-none mb-1 ${s.alerta ? "text-[#ff6b6b]" : s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {([["apagar", "A pagar"], ["pagos", "Pagos"], ["todos", "Todos"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${filtro === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por conta, pacote, cliente…"
            className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[1.4fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Conta Starlink / Pacote</span><span>Valor</span><span>Vence</span><span>Estado</span><span></span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhum kit{filtro === "apagar" ? " por pagar" : ""}.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((k) => (
              <div key={k.id} className="grid md:grid-cols-[1.4fr_1fr_auto_auto_auto] gap-2 md:gap-4 px-6 py-4 md:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><Satellite size={16} /></div>
                  <div className="min-w-0">
                    <div className="text-fg text-sm font-medium truncate">{k.starlink?.product || "Plano Starlink"}</div>
                    <div className="text-faint text-xs truncate">{k.starlink?.accountId || k.conta || "—"}{(k.nome || k.cliente) ? ` · ${k.nome || k.cliente}` : ""}</div>
                  </div>
                </div>
                <div className="font-display text-lg text-fg">{k.starlink?.amount || "—"}</div>
                <div className="text-muted text-sm self-center">{k.starlink?.dueDate || "—"}</div>
                <div className="self-center">
                  {k._pago ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-accent/40 text-accent bg-accent/10 whitespace-nowrap"><BadgeCheck size={12} /> {String(k.starlink?.status || "").toLowerCase().includes("ativ") ? "Ativa" : "Pago"}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-[#ff6b6b]/40 text-[#ff6b6b] bg-[#ff6b6b]/10 whitespace-nowrap"><AlertTriangle size={12} /> {k.starlink?.status || "Por pagar"}</span>
                  )}
                </div>
                <div className="self-center justify-self-start md:justify-self-end">
                  {!k._pago && (
                    <button onClick={() => marcarPago(k)} disabled={marcando === k.id}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-line text-fg text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors disabled:opacity-50">
                      <Check size={14} /> {marcando === k.id ? "…" : "Marcar pago"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
