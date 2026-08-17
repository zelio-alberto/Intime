import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, where, addDoc, updateDoc, doc, getDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { monthKey, fmtMoney, kitAlocado, logMov } from "./gestaoUtils";
import { ArrowDownLeft, Link2, Link2Off, Search, RefreshCw, Link as LinkIcon, X, Satellite } from "lucide-react";

type Tx = { id: string } & Record<string, any>;

function quando(ts: any): string {
  try { return ts?.toDate ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; }
}
const up = (s: any) => String(s || "").trim().toUpperCase();

export default function Transacoes() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [txsAssoc, setTxsAssoc] = useState<Tx[]>([]);
  const [pagsByCodigo, setPagsByCodigo] = useState<Record<string, { numeroConta: string; clienteNome: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "assoc" | "porassoc">("todas");
  const [busca, setBusca] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [msg, setMsg] = useState("");
  const [kits, setKits] = useState<DocumentData[]>([]);
  const [alvo, setAlvo] = useState<Tx | null>(null);
  const [buscaKit, setBuscaKit] = useState("");
  const [salvando, setSalvando] = useState(false);

  const associar = async (tx: Tx, kit: DocumentData) => {
    setSalvando(true);
    try {
      let numeroConta = String(kit.numeroConta || "");
      if (!numeroConta && kit.clienteId) {
        try { const cs = await getDoc(doc(db, "clientes", String(kit.clienteId))); numeroConta = cs.exists() ? String(cs.data().numeroConta || "") : ""; } catch { /* */ }
      }
      await addDoc(collection(db, "pagamentos"), {
        kitId: kit.id, clienteId: kit.clienteId || "", clienteNome: kit.cliente || "", numeroConta,
        mes: monthKey(), valor: Number(tx.valor) || 0, metodo: tx.operadora || "M-Pesa", codigo: tx.codigo || "",
        estado: "Aprovado", tipo: "Mensalidade",
        ...(kit.promotor ? { promotor: kit.promotor } : {}),
        data: serverTimestamp(),
      });
      await updateDoc(doc(db, "transacoesMpesa", tx.id), { estado: "associado", clienteId: kit.clienteId || "", kitId: kit.id, numeroConta });
      await logMov("pagamento", `M-Pesa associado a ${kit.cliente || ""} · ${fmtMoney(Number(tx.valor) || 0)} (${tx.codigo || ""})`, { kitId: kit.id, clienteId: String(kit.clienteId || ""), valor: Number(tx.valor) || 0 });
      setAlvo(null); setBuscaKit("");
    } catch { /* */ }
    finally { setSalvando(false); }
  };

  // Força o "casador" no servidor (liga transações ↔ pagamentos e marca Aprovado).
  const conferirPagamentos = async () => {
    let url = localStorage.getItem("intime_server_url") || "";
    let secret = localStorage.getItem("intime_run_secret") || "";
    if (!url) { const v = window.prompt("URL do servidor de gestão (ex.: https://intime-gestao-server.onrender.com):", ""); if (!v) return; url = v.trim().replace(/\/+$/, ""); localStorage.setItem("intime_server_url", url); }
    if (!secret) { const v = window.prompt("RUN_SECRET do servidor:", ""); if (!v) return; secret = v.trim(); localStorage.setItem("intime_run_secret", secret); }
    setConferindo(true); setMsg("");
    try {
      const r = await fetch(`${url}/intime/run/match-payments`, { method: "POST", headers: { "x-run-secret": secret } });
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
    // As associadas carregam-se todas (sem limite) — as antigas caem fora das 300 recentes mas têm de aparecer na lista.
    const u1b = onSnapshot(query(collection(db, "transacoesMpesa"), where("estado", "==", "associado")),
      (s) => setTxsAssoc(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    const u2 = onSnapshot(collection(db, "pagamentos"), (s) => {
      const map: Record<string, { numeroConta: string; clienteNome: string }> = {};
      s.docs.forEach((d) => {
        const x = d.data() as any;
        if (x.codigo) map[up(x.codigo)] = { numeroConta: x.numeroConta || "", clienteNome: x.clienteNome || "" };
      });
      setPagsByCodigo(map);
    }, () => {});
    const u3 = onSnapshot(collection(db, "kits"), (s) => setKits(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    return () => { u1(); u1b(); u2(); u3(); };
  }, []);

  const enriched = useMemo(() => {
    const vistos = new Set(txs.map((t) => t.id));
    const todas = [...txs, ...txsAssoc.filter((t) => !vistos.has(t.id))];
    todas.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return todas.map((t) => {
      const liga = pagsByCodigo[up(t.codigo)];
      const conta = t.numeroConta || liga?.numeroConta || "";
      const assoc = !!conta || !!t.clienteId || String(t.estado || "").toLowerCase() === "associado";
      return { ...t, _assoc: assoc, _conta: conta, _cliente: liga?.clienteNome || t.nome || "" };
    });
  }, [txs, txsAssoc, pagsByCodigo]);

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
        <div className="flex flex-wrap gap-1">
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
                <div className="self-center flex items-center gap-2 justify-self-start md:justify-self-end">
                  {t._assoc ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-accent/40 text-accent bg-accent/10 whitespace-nowrap"><Link2 size={12} /> {t._conta || t._cliente || "Associada"}</span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-muted whitespace-nowrap"><Link2Off size={12} /> Por associar</span>
                      <button onClick={() => { setAlvo(t); setBuscaKit(""); }} className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-fg hover:bg-fg hover:text-bg transition-colors whitespace-nowrap"><LinkIcon size={11} /> Associar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {alvo && (
        <div className="fixed inset-0 z-[400] flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAlvo(null)} />
          <div className="relative w-full max-w-md h-full bg-bg border-l border-line overflow-y-auto">
            <div className="sticky top-0 bg-bg/95 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-xl text-fg">Associar {fmtMoney(Number(alvo.valor) || 0)}</div>
                <div className="text-faint text-xs">{alvo.nome || alvo.remetente || ""} · {alvo.codigo || ""}</div>
              </div>
              <button onClick={() => setAlvo(null)} className="w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg"><X size={16} /></button>
            </div>
            <div className="p-6">
              <p className="text-muted text-sm mb-4">Escolha o cliente (kit alocado) a quem pertence este pagamento.</p>
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input value={buscaKit} onChange={(e) => setBuscaKit(e.target.value)} placeholder="Procurar cliente…" className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-2">
                {kits.filter(kitAlocado).filter((k) => { const b = buscaKit.toLowerCase(); return !b || [k.cliente, k.pacote, k.conta].some((v) => String(v || "").toLowerCase().includes(b)); }).map((k) => (
                  <button key={k.id} disabled={salvando} onClick={() => associar(alvo, k)} className="w-full text-left border border-line p-4 hover:border-accent/50 hover:bg-card/40 transition-colors flex items-center gap-3 disabled:opacity-50">
                    <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><Satellite size={15} /></div>
                    <div className="min-w-0 flex-1"><div className="text-fg font-medium truncate">{k.cliente || "—"}</div><div className="text-faint text-xs truncate">{k.pacote || ""}{k.mensalidade ? ` · ${k.mensalidade}` : ""}</div></div>
                    <LinkIcon size={15} className="text-faint" />
                  </button>
                ))}
                {kits.filter(kitAlocado).length === 0 && <p className="text-faint text-sm text-center py-8">Nenhum kit alocado a clientes.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
