import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, Timestamp, type DocumentData } from "firebase/firestore";
import { db, auth } from "../firebase";
import { pageTitle, input, label } from "./ui";
import { parseMoney, fmtMoney, monthKey, monthLabel, fmtDateTime, kitAlocado, logMov } from "./gestaoUtils";
import { ArrowDownLeft, ArrowUpRight, Download, Plus, Search, X, Satellite, Package, Wallet } from "lucide-react";

// Masterfile: livro financeiro único — entradas (faturação a clientes, coleção
// `pagamentos` aprovados) e saídas (coleção `despesas`: equipamento, Starlink, outras).

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
  const [form, setForm] = useState({ tipo: "equipamento" as "equipamento" | "outra", data: hojeIso(), valor: "", descricao: "", fornecedor: "", kitId: "" });

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

  const livro = useMemo<Linha[]>(() => {
    const linhas: Linha[] = [];
    for (const p of pags) {
      if (String(p.estado ?? "Aprovado") !== "Aprovado") continue;
      linhas.push({
        id: `p_${p.id}`, ts: ms(p.data) || ms(p.createdAt), data: p.data instanceof Timestamp ? p.data : null,
        mes: String(p.mes || ""), categoria: "entrada",
        descricao: `${p.tipo || "Mensalidade"} — ${p.clienteNome || "cliente"}`,
        detalhe: [p.numeroConta, p.metodo, p.codigo].filter(Boolean).join(" · "),
        entrada: parseMoney(p.valor), saida: 0,
      });
    }
    for (const d of despesas) {
      const cat: Categoria = d.tipo === "equipamento" ? "equipamento" : d.tipo === "starlink" ? "starlink" : "outra";
      linhas.push({
        id: `d_${d.id}`, ts: ms(d.data) || ms(d.createdAt), data: d.data instanceof Timestamp ? d.data : null,
        mes: String(d.mes || ""), categoria: cat,
        descricao: String(d.descricao || CAT_LABEL[cat]),
        detalhe: [d.fornecedor, d.kitNome].filter(Boolean).join(" · "),
        entrada: 0, saida: parseMoney(d.valor),
      });
    }
    linhas.sort((a, b) => b.ts - a.ts);
    return linhas;
  }, [pags, despesas]);

  const meses = useMemo(() => Array.from(new Set(livro.map((l) => l.mes).filter(Boolean))).sort().reverse(), [livro]);

  // Totais respeitam o mês escolhido, mas não o filtro de categoria/busca.
  const doMes = useMemo(() => livro.filter((l) => !mesFiltro || l.mes === mesFiltro), [livro, mesFiltro]);
  const totEntradas = doMes.reduce((s, l) => s + l.entrada, 0);
  const totSaidas = doMes.reduce((s, l) => s + l.saida, 0);
  const saldo = totEntradas - totSaidas;

  const lista = doMes.filter((l) => {
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
    const num = (v: number) => (v ? String(v).replace(".", ",") : "");
    const linhas = [
      ["Data", "Mês", "Tipo", "Descrição", "Detalhe", "Entrada (MT)", "Saída (MT)"].map(esc).join(";"),
      ...lista.map((l) => [
        esc(fmtDateTime(l.data)), esc(l.mes ? monthLabel(l.mes) : ""), esc(CAT_LABEL[l.categoria]),
        esc(l.descricao), esc(l.detalhe), num(l.entrada), num(l.saida),
      ].join(";")),
      "",
      [esc("Totais"), "", "", "", "", num(totEntradas), num(totSaidas)].join(";"),
      [esc("Saldo"), "", "", "", "", num(saldo), ""].join(";"),
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
        tipo: form.tipo,
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
      await logMov("despesa", `${form.tipo === "equipamento" ? "Compra de equipamento" : "Despesa"}: ${form.descricao.trim()} · ${fmtMoney(valor)}`, { kitId: form.kitId || "", valor });
      setFormAberto(false);
      setForm({ tipo: "equipamento", data: hojeIso(), valor: "", descricao: "", fornecedor: "", kitId: "" });
    } catch {
      setErro("Não foi possível gravar. Tente novamente.");
    } finally { setSalvando(false); }
  };

  const stats = [
    { label: "Entradas" + (mesFiltro ? ` · ${monthLabel(mesFiltro)}` : " (total)"), value: fmtMoney(totEntradas), cls: "text-accent" },
    { label: "Saídas" + (mesFiltro ? ` · ${monthLabel(mesFiltro)}` : " (total)"), value: fmtMoney(totSaidas), cls: "text-[#ff6b6b]" },
    { label: "Saldo", value: fmtMoney(saldo), cls: saldo >= 0 ? "text-accent" : "text-[#ff6b6b]" },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className={pageTitle}>Masterfile</h1>
          <p className="text-muted text-sm">Livro financeiro único — faturação aos clientes, compras de equipamento, Starlink e outras despesas.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setErro(""); setFormAberto(true); }} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors">
            <Plus size={14} /> Lançar despesa
          </button>
          <button onClick={exportCsv} disabled={lista.length === 0} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors disabled:opacity-50">
            <Download size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="border border-line bg-card p-6">
            <div className={`font-display text-3xl leading-none mb-1 ${s.cls}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

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
                <div className="text-faint text-xs">Compra de equipamento ou outra saída. (Starlink lança-se sozinha ao marcar "pago".)</div>
              </div>
              <button onClick={() => setFormAberto(false)} className="w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className={label}>Tipo</span>
                <div className="flex gap-1">
                  {([["equipamento", "Equipamento"], ["outra", "Outra despesa"]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setForm({ ...form, tipo: k })}
                      className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${form.tipo === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className={label}>Descrição *</span>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder={form.tipo === "equipamento" ? "Ex.: Kit Starlink Mini" : "Ex.: Transporte de instalação"} className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Valor (MT) *</span>
                  <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="14290" inputMode="decimal" className={input} />
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
                <ArrowUpRight size={14} /> {salvando ? "A gravar…" : "Gravar despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
