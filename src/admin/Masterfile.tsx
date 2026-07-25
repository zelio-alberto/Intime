import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, Timestamp, type DocumentData } from "firebase/firestore";
import { db, auth } from "../firebase";
import { pageTitle, input, label } from "./ui";
import { parseMoney, fmtMoney, monthKey, monthLabel, fmtDateTime, kitAlocado, starlinkOf, logMov } from "./gestaoUtils";
import { ArrowDownLeft, Download, Plus, Search, X, Satellite, Package, Wallet, TrendingUp, TrendingDown } from "lucide-react";

// Masterfile: demonstração de RESULTADOS do negócio, derivada automaticamente:
//   entradas = pagamentos aprovados; custo Starlink = amount × kit alocado × mês;
//   investimento = custoAquisicao do kit no mês de início.
// Manual só as despesas não-sistemáticas (coleção `despesas`).

type Categoria = "entrada" | "equipamento" | "starlink" | "outra";
type Linha = {
  id: string;
  ts: number;
  data: Timestamp | null;
  mes: string;
  categoria: Categoria;
  descricao: string;
  detalhe: string;
  entrada: number;
  saida: number;
};
type MesResumo = { mes: string; entradas: number; starlink: number; investimento: number; outras: number; resultado: number; acumulado: number };

const CAT_LABEL: Record<Categoria, string> = {
  entrada: "Entrada", equipamento: "Equipamento", starlink: "Starlink", outra: "Despesa",
};
const CAT_PILL: Record<Categoria, string> = {
  entrada: "text-accent border-accent/40 bg-accent/10",
  equipamento: "text-[#e6b45a] border-[#e6b45a]/40 bg-[#e6b45a]/10",
  starlink: "text-[#7ab8ff] border-[#7ab8ff]/40 bg-[#7ab8ff]/10",
  outra: "text-muted border-line bg-card/40",
};

const ms = (x: any): number => (x?.toMillis ? x.toMillis() : 0);
const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// "2026-06" → lista de meses até ao mês atual, inclusive.
function mesesDesde(inicio: string): string[] {
  const fim = monthKey();
  const out: string[] = [];
  let [y, m] = inicio.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return out;
  for (let i = 0; i < 240; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key === fim) break;
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
// meio do mês, só para ordenar linhas derivadas no livro
const tsDoMes = (mes: string) => new Date(`${mes}-15T12:00:00`).getTime();

export default function Masterfile() {
  const [pags, setPags] = useState<DocumentData[]>([]);
  const [despesas, setDespesas] = useState<DocumentData[]>([]);
  const [kits, setKits] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "entradas" | "equipamento" | "starlink" | "outras">("todos");
  const [mesFiltro, setMesFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ data: hojeIso(), valor: "", descricao: "", fornecedor: "", kitId: "" });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "pagamentos"),
      (s) => { setPags(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); },
      () => setLoading(false));
    const u2 = onSnapshot(collection(db, "despesas"),
      (s) => setDespesas(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    const u3 = onSnapshot(collection(db, "kits"),
      (s) => setKits(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    return () => { u1(); u2(); u3(); };
  }, []);

  const aprovados = useMemo(() => pags.filter((p) => String(p.estado ?? "Aprovado") === "Aprovado"), [pags]);
  // só manuais (ignora docs eq_/sl_ antigos da v1, para nunca contar a dobrar)
  const manuais = useMemo(() => despesas.filter((d) => !d.id.startsWith("eq_") && !d.id.startsWith("sl_") && d.tipo !== "equipamento" && d.tipo !== "starlink"), [despesas]);

  // Início de cada kit = min(1º mês com pagamento, mês do createdAt).
  const kitInfo = useMemo(() => kits.filter(kitAlocado).map((k) => {
    const mesesPagos = aprovados.filter((p) => p.kitId === k.id && p.mes).map((p) => String(p.mes)).sort();
    const criado = k.createdAt?.toDate ? monthKey(k.createdAt.toDate()) : "";
    const inicio = [mesesPagos[0], criado].filter(Boolean).sort()[0] || monthKey();
    return {
      kit: k, inicio,
      nome: String(k.cliente || k.conta || "kit"),
      custoKit: parseMoney(k.custoAquisicao),
      custoSlMes: parseMoney(starlinkOf(k)?.amount),
      meses: mesesDesde(inicio),
    };
  }), [kits, aprovados]);

  // ===== Resumo mensal (a demonstração de resultados) =====
  const resumo = useMemo<MesResumo[]>(() => {
    const porMes: Record<string, MesResumo> = {};
    const get = (mes: string) => (porMes[mes] ||= { mes, entradas: 0, starlink: 0, investimento: 0, outras: 0, resultado: 0, acumulado: 0 });
    for (const p of aprovados) if (p.mes) get(String(p.mes)).entradas += parseMoney(p.valor);
    for (const ki of kitInfo) {
      if (ki.custoKit) get(ki.inicio).investimento += ki.custoKit;
      for (const m of ki.meses) if (ki.custoSlMes) get(m).starlink += ki.custoSlMes;
    }
    for (const d of manuais) if (d.mes) get(String(d.mes)).outras += parseMoney(d.valor);
    const lista = Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes));
    let acc = 0;
    for (const r of lista) { r.resultado = r.entradas - r.starlink - r.investimento - r.outras; acc += r.resultado; r.acumulado = acc; }
    return lista.reverse(); // mais recente primeiro
  }, [aprovados, kitInfo, manuais]);

  const tot = useMemo(() => {
    const t = { entradas: 0, starlink: 0, investimento: 0, outras: 0 };
    for (const r of resumo) { t.entradas += r.entradas; t.starlink += r.starlink; t.investimento += r.investimento; t.outras += r.outras; }
    return { ...t, resultado: t.entradas - t.starlink - t.investimento - t.outras };
  }, [resumo]);
  // Quanto do investimento em kits já foi recuperado pela margem operacional.
  const operacional = tot.entradas - tot.starlink - tot.outras;
  const recuperado = tot.investimento > 0 ? Math.max(0, Math.min(1, operacional / tot.investimento)) : 0;

  // ===== Livro de movimentos (entradas + derivadas + manuais) =====
  const livro = useMemo<Linha[]>(() => {
    const linhas: Linha[] = [];
    for (const p of aprovados) {
      linhas.push({
        id: `p_${p.id}`, ts: ms(p.data) || ms(p.createdAt), data: p.data instanceof Timestamp ? p.data : null,
        mes: String(p.mes || ""), categoria: "entrada",
        descricao: `${p.tipo || "Mensalidade"} — ${p.clienteNome || "cliente"}`,
        detalhe: [p.numeroConta, p.metodo, p.codigo].filter(Boolean).join(" · "),
        entrada: parseMoney(p.valor), saida: 0,
      });
    }
    for (const ki of kitInfo) {
      if (ki.custoKit) {
        linhas.push({
          id: `k_${ki.kit.id}`, ts: ms(ki.kit.createdAt) || tsDoMes(ki.inicio), data: ki.kit.createdAt instanceof Timestamp ? ki.kit.createdAt : null,
          mes: ki.inicio, categoria: "equipamento",
          descricao: `Compra do kit — ${ki.nome}`, detalhe: ki.kit.tipoStarlink || "",
          entrada: 0, saida: ki.custoKit,
        });
      }
      for (const m of ki.meses) {
        if (!ki.custoSlMes) continue;
        linhas.push({
          id: `sl_${ki.kit.id}_${m}`, ts: tsDoMes(m), data: null,
          mes: m, categoria: "starlink",
          descricao: `Plano Starlink ${monthLabel(m)} — ${ki.nome}`, detalhe: starlinkOf(ki.kit)?.product || "Starlink",
          entrada: 0, saida: ki.custoSlMes,
        });
      }
    }
    for (const d of manuais) {
      linhas.push({
        id: `d_${d.id}`, ts: ms(d.data) || ms(d.createdAt), data: d.data instanceof Timestamp ? d.data : null,
        mes: String(d.mes || ""), categoria: "outra",
        descricao: String(d.descricao || "Despesa"),
        detalhe: [d.fornecedor, d.kitNome].filter(Boolean).join(" · "),
        entrada: 0, saida: parseMoney(d.valor),
      });
    }
    linhas.sort((a, b) => b.ts - a.ts);
    return linhas;
  }, [aprovados, kitInfo, manuais]);

  const meses = useMemo(() => resumo.map((r) => r.mes), [resumo]);
  const lista = livro.filter((l) => {
    if (mesFiltro && l.mes !== mesFiltro) return false;
    if (filtro === "entradas" && l.categoria !== "entrada") return false;
    if (filtro === "equipamento" && l.categoria !== "equipamento") return false;
    if (filtro === "starlink" && l.categoria !== "starlink") return false;
    if (filtro === "outras" && l.categoria !== "outra") return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return [l.descricao, l.detalhe, l.mes].some((v) => String(v || "").toLowerCase().includes(b));
    }
    return true;
  });

  const exportCsv = () => {
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const num = (v: number) => (v ? String(v).replace(".", ",") : "0");
    const linhas = [
      esc("RESULTADOS POR MÊS"),
      ["Mês", "Entradas (MT)", "Starlink (MT)", "Investimento (MT)", "Outras (MT)", "Resultado (MT)", "Acumulado (MT)"].map(esc).join(";"),
      ...resumo.map((r) => [esc(monthLabel(r.mes)), num(r.entradas), num(r.starlink), num(r.investimento), num(r.outras), num(r.resultado), num(r.acumulado)].join(";")),
      [esc("TOTAL"), num(tot.entradas), num(tot.starlink), num(tot.investimento), num(tot.outras), num(tot.resultado), ""].join(";"),
      "",
      esc("MOVIMENTOS" + (mesFiltro ? ` — ${monthLabel(mesFiltro)}` : "")),
      ["Data", "Mês", "Tipo", "Descrição", "Detalhe", "Entrada (MT)", "Saída (MT)"].map(esc).join(";"),
      ...lista.map((l) => [
        esc(fmtDateTime(l.data) || monthLabel(l.mes)), esc(l.mes ? monthLabel(l.mes) : ""), esc(CAT_LABEL[l.categoria]),
        esc(l.descricao), esc(l.detalhe), num(l.entrada), num(l.saida),
      ].join(";")),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masterfile${mesFiltro ? `-${mesFiltro}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lancar = async () => {
    setErro("");
    const valor = parseMoney(form.valor);
    if (!form.descricao.trim()) { setErro("A descrição é obrigatória."); return; }
    if (valor <= 0) { setErro("Valor inválido."); return; }
    const dataObj = new Date(`${form.data}T12:00:00`);
    if (isNaN(dataObj.getTime())) { setErro("Data inválida."); return; }
    const kit = kits.find((k) => k.id === form.kitId);
    setSalvando(true);
    try {
      await addDoc(collection(db, "despesas"), {
        tipo: "outra",
        descricao: form.descricao.trim(),
        fornecedor: form.fornecedor.trim(),
        valor,
        kitId: form.kitId || "",
        kitNome: kit ? String(kit.cliente || kit.conta || "") : "",
        mes: monthKey(dataObj),
        data: Timestamp.fromDate(dataObj),
        by: auth.currentUser?.email || "",
        createdAt: serverTimestamp(),
      });
      await logMov("despesa", `Despesa: ${form.descricao.trim()} · ${fmtMoney(valor)}`, { kitId: form.kitId || "", valor });
      setFormAberto(false);
      setForm({ data: hojeIso(), valor: "", descricao: "", fornecedor: "", kitId: "" });
    } catch {
      setErro("Não foi possível gravar. Tente novamente.");
    } finally { setSalvando(false); }
  };

  const cards = [
    { label: "Recebido dos clientes", value: fmtMoney(tot.entradas), cls: "text-accent" },
    { label: "Pago à Starlink", value: fmtMoney(tot.starlink), cls: "text-[#7ab8ff]" },
    { label: "Investido em kits", value: fmtMoney(tot.investimento), cls: "text-[#e6b45a]" },
    { label: "Outras despesas", value: fmtMoney(tot.outras), cls: "text-muted" },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className={pageTitle}>Masterfile</h1>
          <p className="text-muted text-sm">Resultados do negócio — calculados sozinhos a partir dos pagamentos, dos kits e do custo Starlink. Só as despesas avulsas se lançam à mão.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setErro(""); setFormAberto(true); }} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors">
            <Plus size={14} /> Lançar despesa
          </button>
          <button onClick={exportCsv} disabled={resumo.length === 0} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors disabled:opacity-50">
            <Download size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Resultado global */}
      <div className={`border p-6 md:p-8 mb-4 ${tot.resultado >= 0 ? "border-accent bg-accent/[0.05]" : "border-[#e6b45a]/60 bg-[#e6b45a]/[0.05]"}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted mb-2 flex items-center gap-2">
              {tot.resultado >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} Resultado do negócio (tudo incluído)
            </div>
            <div className={`font-display text-5xl leading-none ${tot.resultado >= 0 ? "text-accent" : "text-[#e6b45a]"}`}>{fmtMoney(tot.resultado)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted mb-2">Investimento recuperado</div>
            <div className="font-display text-3xl text-fg">{Math.round(recuperado * 100)}%</div>
            <div className="w-44 h-1.5 bg-line mt-2 ml-auto"><div className="h-full bg-accent" style={{ width: `${Math.round(recuperado * 100)}%` }} /></div>
          </div>
        </div>
        {tot.resultado < 0 && (
          <p className="text-muted text-xs mt-4">Negativo = ainda a recuperar o investimento nos kits. A margem operacional (rendas − Starlink − despesas) já rendeu {fmtMoney(operacional)}.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((s) => (
          <div key={s.label} className="border border-line bg-card p-6">
            <div className={`font-display text-2xl leading-none mb-1 ${s.cls}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Resultados por mês */}
      <h2 className="font-display text-xl text-fg mb-3">Resultados por mês</h2>
      <div className="border border-line bg-card mb-10 overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
            <span>Mês</span><span className="text-right">Entradas</span><span className="text-right">Starlink</span><span className="text-right">Investimento</span><span className="text-right">Outras</span><span className="text-right">Resultado</span><span className="text-right">Acumulado</span>
          </div>
          {loading ? (
            <p className="text-muted text-sm px-6 py-10 text-center">A carregar…</p>
          ) : resumo.length === 0 ? (
            <p className="text-faint text-sm px-6 py-10 text-center">Ainda sem dados.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {resumo.map((r) => (
                <div key={r.mes} className="grid grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center text-sm">
                  <span className="text-fg font-medium">{monthLabel(r.mes)}</span>
                  <span className="text-right text-accent">{r.entradas ? `+ ${fmtMoney(r.entradas, false)}` : "—"}</span>
                  <span className="text-right text-[#7ab8ff]">{r.starlink ? `− ${fmtMoney(r.starlink, false)}` : "—"}</span>
                  <span className="text-right text-[#e6b45a]">{r.investimento ? `− ${fmtMoney(r.investimento, false)}` : "—"}</span>
                  <span className="text-right text-muted">{r.outras ? `− ${fmtMoney(r.outras, false)}` : "—"}</span>
                  <span className={`text-right font-medium ${r.resultado >= 0 ? "text-accent" : "text-[#ff6b6b]"}`}>{fmtMoney(r.resultado, false)}</span>
                  <span className={`text-right ${r.acumulado >= 0 ? "text-fg" : "text-[#e6b45a]"}`}>{fmtMoney(r.acumulado, false)}</span>
                </div>
              ))}
              <div className="grid grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center text-sm bg-bg/40">
                <span className="text-faint text-[11px] font-mono uppercase tracking-widest">Total</span>
                <span className="text-right text-accent font-medium">{fmtMoney(tot.entradas, false)}</span>
                <span className="text-right text-[#7ab8ff] font-medium">{fmtMoney(tot.starlink, false)}</span>
                <span className="text-right text-[#e6b45a] font-medium">{fmtMoney(tot.investimento, false)}</span>
                <span className="text-right text-muted font-medium">{fmtMoney(tot.outras, false)}</span>
                <span className={`text-right font-medium ${tot.resultado >= 0 ? "text-accent" : "text-[#ff6b6b]"}`}>{fmtMoney(tot.resultado, false)}</span>
                <span />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movimentos */}
      <h2 className="font-display text-xl text-fg mb-3">Movimentos</h2>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 flex-wrap">
          {([["todos", "Todos"], ["entradas", "Entradas"], ["equipamento", "Equipamento"], ["starlink", "Starlink"], ["outras", "Outras"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${filtro === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
          ))}
        </div>
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
          className="bg-bg border border-line px-3 py-2 text-xs font-mono uppercase tracking-[0.15em] text-muted outline-none focus:border-accent">
          <option value="">Todos os meses</option>
          {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por descrição, cliente, fornecedor…"
            className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
        </div>
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[110px_1fr_auto_140px] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Data</span><span>Descrição</span><span>Tipo</span><span className="text-right">Valor</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhum movimento{filtro !== "todos" || mesFiltro ? " neste filtro" : ""}.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((l) => (
              <div key={l.id} className="grid md:grid-cols-[110px_1fr_auto_140px] gap-2 md:gap-4 px-6 py-4 md:items-center">
                <div className="text-faint text-xs self-center whitespace-nowrap">{fmtDateTime(l.data) || (l.mes ? monthLabel(l.mes) : "—")}</div>
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`w-9 h-9 grid place-items-center border shrink-0 ${l.entrada ? "border-accent/40 text-accent" : "border-line text-[#ff6b6b]"}`}>
                    {l.categoria === "entrada" ? <ArrowDownLeft size={16} /> : l.categoria === "starlink" ? <Satellite size={15} /> : l.categoria === "equipamento" ? <Package size={15} /> : <Wallet size={15} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-fg text-sm truncate">{l.descricao}</div>
                    <div className="text-faint text-xs truncate">{l.detalhe || (l.mes ? monthLabel(l.mes) : "")}</div>
                  </div>
                </div>
                <span className={`self-center justify-self-start inline-flex text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border whitespace-nowrap ${CAT_PILL[l.categoria]}`}>{CAT_LABEL[l.categoria]}</span>
                <div className={`self-center md:text-right font-display text-lg whitespace-nowrap ${l.entrada ? "text-accent" : "text-[#ff6b6b]"}`}>
                  {l.entrada ? `+ ${fmtMoney(l.entrada)}` : `− ${fmtMoney(l.saida)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formAberto && (
        <div className="fixed inset-0 z-[400] flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFormAberto(false)} />
          <div className="relative w-full max-w-md h-full bg-bg border-l border-line overflow-y-auto">
            <div className="sticky top-0 bg-bg/95 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-xl text-fg">Lançar despesa</div>
                <div className="text-faint text-xs">Só despesas avulsas (transporte, material…). Starlink e kits entram sozinhos.</div>
              </div>
              <button onClick={() => setFormAberto(false)} className="w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className={label}>Descrição *</span>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Transporte de instalação" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Valor (MT) *</span>
                  <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="500" inputMode="decimal" className={input} />
                </div>
                <div>
                  <span className={label}>Data</span>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={input} />
                </div>
              </div>
              <div>
                <span className={label}>Fornecedor</span>
                <input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Opcional" className={input} />
              </div>
              <div>
                <span className={label}>Kit / cliente</span>
                <select value={form.kitId} onChange={(e) => setForm({ ...form, kitId: e.target.value })} className={input}>
                  <option value="">— Sem kit associado —</option>
                  {kits.filter(kitAlocado).map((k) => <option key={k.id} value={k.id}>{k.cliente || k.conta || k.id}</option>)}
                </select>
              </div>
              {erro && <p className="text-[#ff6b6b] text-sm">{erro}</p>}
              <button onClick={lancar} disabled={salvando}
                className="w-full flex items-center justify-center gap-2 border border-line px-4 py-3 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors disabled:opacity-50">
                <Wallet size={14} /> {salvando ? "A gravar…" : "Gravar despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
