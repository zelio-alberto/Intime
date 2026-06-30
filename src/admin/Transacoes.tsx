import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { ArrowDownLeft, Link2, Link2Off, Search, RefreshCw } from "lucide-react";

type Tx = { id: string } & Record<string, any>;

function quando(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}
const up = (s: any) => String(s || "").trim().toUpperCase();

export default function Transacoes() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pagsByCodigo, setPagsByCodigo] = useState<Record<string, { numeroConta: string; clienteNome: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "assoc" | "porassoc">("todas");
  const [busca, setBusca] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [msg, setMsg] = useState("");

  // Força o "casador" no servidor (liga transações ↔ pagamentos e marca Aprovado).
  const conferirPagamentos = async () => {
    let url = localStorage.getItem("intime_server_url") || "";
    let secret = localStorage.getItem("intime_run_secret") || "";
    if (!url) { const v = window.prompt("URL do servidor de gestão (ex.: https://intime-gestao-server.onrender.com):", ""); if (!v) return; url = v.trim().replace(/\/+$/, ""); localStorage.setItem("intime_server_url", url); }
    if (!secret) { const v = window.prompt("RUN_SECRET do servidor:", ""); if (!v) return; secret = v.trim(); localStorage.setItem("intime_run_secret", secret); }
    setConferindo(true); setMsg("");
    try {
      const r = await fetch(`${url}/api/run/match-payments`, { method: "POST", headers: { "x-run-secret": secret } });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) setMsg(`Erro (${r.status}): ${j.error || "verifique o URL e o segredo"}.`);
      else setMsg(`✓ ${j.confirmados ?? 0} pagamento(s) confirmado(s) de ${j.pendentes ?? 0} pendente(s).`);
    } catch {
      setMsg("Servidor indisponível — confirme que o backend de gestão está no ar (deploy no Render).");
    } finally { setConferindo(false); }
  };

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "transacoesMpesa"), orderBy("createdAt", "desc"), limit(300)),
      (s) => { setTxs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); },
      () => setLoading(false));
    const u2 = onSnapshot(collection(db, "pagamentos"), (s) => {
      const map: Record<string, { numeroConta: string; clienteNome: string }> = {};
      s.docs.forEach((d) => {
        const x = d.data() as any;
        if (x.codigo) map[up(x.codigo)] = { numeroConta: x.numeroConta || "", clienteNome: x.clienteNome || "" };
      });
      setPagsByCodigo(map);
    }, () => {});
    return () => { u1(); u2(); };
  }, []);

  const enriched = useMemo(() => txs.map((t) => {
    const liga = pagsByCodigo[up(t.codigo)];
    const conta = t.numeroConta || liga?.numeroConta || "";
    return { ...t, _assoc: !!conta, _conta: conta, _cliente: liga?.clienteNome || t.nome || "" };
  }), [txs, pagsByCodigo]);

  const total = enriched.length;
  const nAssoc = enriched.filter((t) => t._assoc).length;

  const lista = enriched.filter((t) => {
    if (filtro === "assoc" && !t._assoc) return false;
    if (filtro === "porassoc" && t._assoc) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return [t.codigo, t.remetente, t.nome, t._conta, t.operadora].some((v) => String(v || "").toLowerCase().includes(b));
    }
    return true;
  });

  const stats = [
    { label: "Total recebidas", value: total },
    { label: "Associadas a pagamento", value: nAssoc, accent: true },
    { label: "Por associar", value: total - nAssoc },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className={pageTitle}>Transações recebidas</h1>
          <p className="text-muted text-sm">Pagamentos lidos pelo gateway (M-Pesa / e-Mola). Umas ficam ligadas a um pagamento de cliente, outras ainda por associar.</p>
        </div>
        <button onClick={conferirPagamentos} disabled={conferindo} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors shrink-0 disabled:opacity-50">
          <RefreshCw size={14} className={conferindo ? "animate-spin" : ""} /> {conferindo ? "A conferir…" : "Conferir pagamentos"}
        </button>
      </div>
      {msg && <div className="border border-line bg-card px-4 py-3 text-sm text-fg mb-4">{msg}</div>}
      <div className="mb-8" />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.accent && s.value > 0 ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-4xl leading-none mb-1 ${s.accent && s.value > 0 ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {([["todas", "Todas"], ["assoc", "Associadas"], ["porassoc", "Por associar"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${filtro === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por código, número, nome ou conta…"
            className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Valor</span><span>De</span><span>Código</span><span>Quando</span><span>Estado</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhuma transação{filtro !== "todas" ? " neste filtro" : ""}.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((t) => (
              <div key={t.id} className="grid md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-6 py-4 md:items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><ArrowDownLeft size={16} /></div>
                  <div className="font-display text-lg text-fg whitespace-nowrap">{(Number(t.valor) || 0).toLocaleString("pt-PT")} MT</div>
                </div>
                <div className="min-w-0">
                  <div className="text-fg text-sm truncate">{t.nome || "—"}</div>
                  <div className="text-faint text-xs">{t.remetente || "—"} · {t.operadora || ""}</div>
                </div>
                <div className="font-mono text-xs text-muted break-all self-center">{t.codigo || "—"}</div>
                <div className="text-faint text-xs self-center">{quando(t.createdAt)}</div>
                <div className="self-center">
                  {t._assoc ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-accent/40 text-accent bg-accent/10 whitespace-nowrap"><Link2 size={12} /> {t._conta}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-muted whitespace-nowrap"><Link2Off size={12} /> Por associar</span>
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
