// Ficha comercial do cliente (vista full-screen do admin/Clientes): resumo da
// posição da conta sempre visível (próximo vencimento, dívida, total pago) e
// separadores Dados · Faturação · Kits · Extrato · Contrato — só se vê a secção
// escolhida, sem scroll pelas outras. Navegação anterior/seguinte entre
// clientes (botões ou setas do teclado) mantém o separador ativo.
// Documentos imprimíveis em ./documentos.ts.
import { useEffect, useMemo, useState } from "react";
import {
  collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp,
  Timestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { input, label } from "./ui";
import { fmtMoney, parseMoney, starlinkOf, margemMensal, fmtDateTime, estadoPillCls, monthKey, monthLabel, logMov } from "./gestaoUtils";
import { useSiteConfig } from "../useSiteConfig";
import { abrirFatura, abrirProximaFatura, abrirExtrato, imprimirContrato } from "./documentos";
import { X, Plus, FileText, Printer, MessageCircle, ImageIcon, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

type Cli = { id: string } & DocumentData;
type Pag = { id: string } & DocumentData;
type Tab = "dados" | "faturacao" | "kits" | "extrato" | "contrato";

const DAY = 86400000;
const pagMs = (p: DocumentData) => (p.data instanceof Timestamp ? p.data.toMillis() : 0);
const aprovado = (p: DocumentData) => { const e = String(p.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); };
const emAtraso = (e?: string) => { const x = (e || "").toLowerCase(); return x.includes("atraso") || x.includes("suspens") || x.includes("dívida") || x.includes("divida"); };

// Mensalidade a cada 30 dias — mesma regra do portal (Conta.tsx): a partir do
// último pagamento aprovado (cicloInicio se adiantado), senão da ativação/criação.
function proximaData(dados: DocumentData, pags: DocumentData[]): Date | null {
  const aprov = pags.find(aprovado);
  let base: Date | null = null;
  if (aprov?.cicloInicio instanceof Timestamp) base = aprov.cicloInicio.toDate();
  else if (aprov?.data instanceof Timestamp) base = aprov.data.toDate();
  else if (dados.ativadoEm instanceof Timestamp) base = dados.ativadoEm.toDate();
  else if (dados.createdAt instanceof Timestamp) base = dados.createdAt.toDate();
  else if (dados.dueDate instanceof Timestamp) return dados.dueDate.toDate();
  if (!base) return null;
  const next = new Date(base); next.setDate(next.getDate() + 30);
  return next;
}

export default function FichaCliente({ cli, onClose, onPrev, onNext, pos }: {
  cli: Cli; onClose: () => void;
  onPrev?: () => void; onNext?: () => void; pos?: { i: number; total: number };
}) {
  const cfg = useSiteConfig();
  const [tab, setTab] = useState<Tab>("dados");
  const [portal, setPortal] = useState<DocumentData | null>(null);
  const [kits, setKits] = useState<Pag[]>([]);
  const [pags, setPags] = useState<Pag[]>([]);
  const [cts, setCts] = useState<Pag[]>([]);

  const [reg, setReg] = useState(false);
  const [mes, setMes] = useState(monthKey());
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("M-Pesa");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const conta = String(cli.numeroConta || "");

  const carregarPags = async () => {
    // o admin regista pagamentos por clienteId e o portal por numeroConta — juntar os dois
    const mapa = new Map<string, Pag>();
    for (const w of [where("clienteId", "==", cli.id), ...(conta ? [where("numeroConta", "==", conta)] : [])]) {
      try {
        const s = await getDocs(query(collection(db, "pagamentos"), w));
        s.docs.forEach((d) => mapa.set(d.id, { id: d.id, ...d.data() }));
      } catch { /* */ }
    }
    setPags([...mapa.values()].sort((a, b) => pagMs(b) - pagMs(a)));
  };

  useEffect(() => {
    // limpar o estado do cliente anterior ao navegar entre fichas (o separador mantém-se)
    setPortal(null); setKits([]); setPags([]); setCts([]);
    setReg(false); setMsg("");
    (async () => {
      if (conta) { try { const p = await getDoc(doc(db, "portalContas", conta)); if (p.exists()) setPortal(p.data()); } catch { /* */ } }
      try { const ks = await getDocs(query(collection(db, "kits"), where("clienteId", "==", cli.id))); setKits(ks.docs.map((d) => ({ id: d.id, ...d.data() }))); } catch { /* */ }
      try {
        let s = await getDocs(query(collection(db, "contratos"), where("clienteId", "==", cli.id)));
        if (s.empty && conta) s = await getDocs(query(collection(db, "contratos"), where("numeroConta", "==", conta)));
        setCts(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch { /* */ }
      await carregarPags();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cli.id]);

  // teclado: Esc fecha, ←/→ navegam (fora de campos de texto)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onPrev, onNext]);

  const kit = kits[0];

  // "dados" no formato que o portal usa nas faturas (portalContas por cima do cliente)
  const dados = useMemo<DocumentData>(() => ({
    ...cli, ...(portal || {}),
    numeroConta: conta,
    pacote: portal?.pacote || kit?.pacote || cli.pacote || "",
    mensalidade: portal?.mensalidade || kit?.mensalidade || cli.mensalidade || "",
    estado: portal?.estado || cli.estado || "",
  }), [cli, portal, kit, conta]);

  const vence = useMemo(() => proximaData(dados, pags), [dados, pags]);
  const dias = vence ? Math.ceil((vence.getTime() - Date.now()) / DAY) : null;
  const mensal = parseMoney(dados.mensalidade);
  const atraso = emAtraso(String(dados.estado)) || (dias !== null && dias < 0);
  const divida = atraso ? mensal : 0;
  const totalPago = pags.filter(aprovado).reduce((s, p) => s + parseMoney(p.valor), 0);
  const desde = portal?.ativadoEm instanceof Timestamp ? portal.ativadoEm.toDate()
    : cli.createdAt instanceof Timestamp ? cli.createdAt.toDate() : null;

  const waDigits = String(cli.whatsapp || "").replace(/\D/g, "");
  const waLink = waDigits ? `https://wa.me/${waDigits.startsWith("258") ? waDigits : "258" + waDigits.replace(/^0+/, "")}` : "";

  const abrirReg = () => { setValor(mensal ? String(Math.round(mensal)) : ""); setMes(monthKey()); setMsg(""); setReg(true); };
  const registar = async () => {
    if (parseMoney(valor) <= 0) { setMsg("Indique o valor."); return; }
    setSaving(true); setMsg("");
    try {
      await addDoc(collection(db, "pagamentos"), {
        kitId: kit?.id || "", clienteId: cli.id, clienteNome: cli.nome || "", numeroConta: conta,
        mes, valor: parseMoney(valor), metodo, estado: "Aprovado", tipo: "Mensalidade",
        ...(cli.promotor || kit?.promotor ? { promotor: cli.promotor || kit?.promotor } : {}),
        data: serverTimestamp(),
      });
      await logMov("pagamento", `Pagamento ${monthLabel(mes)} · ${fmtMoney(parseMoney(valor))} (${metodo}) · ${cli.nome || ""}`, { kitId: kit?.id, clienteId: cli.id, valor: parseMoney(valor) });
      setReg(false); setMsg("Pagamento registado ✓"); await carregarPags();
    } catch { setMsg("Erro ao registar. Tente de novo."); }
    finally { setSaving(false); }
  };

  const info: [string, string][] = [
    ["Tipo", cli.tipo === "empresa" ? "Empresa" : "Particular"],
    ["Conta", conta || "—"],
    ["Documento", String(cli.documento || "—")],
    ["WhatsApp", String(cli.whatsapp || "—")],
    ["Email", String(cli.email || "—")],
    ["Província", String(cli.provincia || "—")],
    ["Cidade", String(cli.cidade || "—")],
    ["Bairro", String(cli.bairro || "—")],
    ["Referência", String(cli.referencia || "—")],
    ["GPS", String(cli.gps || "—")],
    ...(cli.tipo === "empresa" ? [["Empresa", String(cli.nomeEmpresa || "—")], ["NUIT", String(cli.nuit || "—")], ["Ramo", String(cli.tipoNegocio || "—")]] as [string, string][] : []),
    ...(cli.promotor ? [["Promotor", String(cli.promotor)]] as [string, string][] : []),
    ...(desde ? [["Cliente desde", desde.toLocaleDateString("pt-PT")]] as [string, string][] : []),
  ];
  const fotos: [string, string][] = ([["Documento", cli.fotoDoc], ["Casa", cli.fotoCasa], ["Empresa", cli.fotoEmpresa]] as [string, unknown][])
    .filter(([, u]) => u).map(([k, u]) => [k, String(u)]);

  const fmtDia = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  const ct = cts[0] || null;

  const acao = "inline-flex items-center gap-2 border border-line px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.15em] text-fg hover:bg-fg hover:text-bg transition-colors";
  const navBtn = "w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg hover:border-accent/50 transition-colors disabled:opacity-30 disabled:pointer-events-none";
  const miniBtn = "inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border border-line text-fg hover:bg-fg hover:text-bg transition-colors";

  const TABS: { id: Tab; label: string }[] = [
    { id: "dados", label: "Dados" },
    { id: "faturacao", label: "Faturação" },
    { id: "kits", label: `Kits${kits.length ? ` (${kits.length})` : ""}` },
    { id: "extrato", label: `Extrato${pags.length ? ` (${pags.length})` : ""}` },
    { id: "contrato", label: cts.length > 1 ? `Contratos (${cts.length})` : "Contrato" },
  ];

  return (
    <div className="fixed inset-0 z-[400] bg-bg overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={onClose} title="Voltar à lista (Esc)" className="inline-flex items-center gap-2 border border-line px-3 py-2 text-[11px] font-mono uppercase tracking-[0.15em] text-muted hover:text-fg hover:border-accent/50 transition-colors shrink-0">
                <ArrowLeft size={14} /> <span className="hidden sm:inline">Clientes</span>
              </button>
              <div className="min-w-0">
                <div className="font-display text-2xl text-fg truncate">{cli.nome || "—"}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-faint text-xs font-mono">{conta}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border ${estadoPillCls(String(dados.estado))}`}>{dados.estado || "—"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pos && <span className="hidden sm:block text-faint text-xs font-mono mr-1">{pos.i + 1} / {pos.total}</span>}
              <button onClick={onPrev} disabled={!onPrev} title="Cliente anterior (←)" className={navBtn}><ChevronLeft size={16} /></button>
              <button onClick={onNext} disabled={!onNext} title="Cliente seguinte (→)" className={navBtn}><ChevronRight size={16} /></button>
              <button onClick={onClose} title="Fechar (Esc)" className={`${navBtn} ml-1`}><X size={16} /></button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto mt-4 -mb-px">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.15em] border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Próximo vencimento" alerta={dias !== null && dias < 0}
            value={vence ? fmtDia(vence) : "—"}
            sub={dias === null ? "" : dias < 0 ? `vencida há ${-dias} dia${dias === -1 ? "" : "s"}` : dias === 0 ? "vence hoje" : `em ${dias} dia${dias === 1 ? "" : "s"}`} />
          <Tile label="Mensalidade" value={mensal ? fmtMoney(mensal) : "—"} sub={dados.pacote || ""} />
          <Tile label="Em dívida" alerta={divida > 0} value={fmtMoney(divida)} sub={divida > 0 ? "regularizar" : "em dia"} />
          <Tile label="Total pago" value={fmtMoney(totalPago)} sub={`${pags.filter(aprovado).length} pagamento${pags.filter(aprovado).length === 1 ? "" : "s"}`} />
        </div>

        <div className="border border-line bg-card p-5 md:p-6">
          {tab === "dados" && (
            <>
              <div className="grid sm:grid-cols-2 gap-x-6">
                {info.map(([k, v]) => (
                  <div key={k} className="py-2.5 border-b border-line/60">
                    <div className="text-faint text-[11px] font-mono uppercase tracking-widest">{k}</div>
                    <div className="text-fg text-sm mt-0.5 break-words">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {waLink && <a href={waLink} target="_blank" rel="noopener" className={acao}><MessageCircle size={13} /> WhatsApp</a>}
                {fotos.map(([k, u]) => (
                  <a key={k} href={u} target="_blank" rel="noopener" className={acao}><ImageIcon size={13} /> Foto {k}</a>
                ))}
              </div>
            </>
          )}

          {tab === "faturacao" && (
            <>
              <div className="space-y-2">
                <Linha k="Próximo vencimento" v={vence ? `${fmtDia(vence)}${dias !== null ? ` (${dias < 0 ? `há ${-dias}d` : dias === 0 ? "hoje" : `em ${dias}d`})` : ""}` : "—"} alerta={dias !== null && dias < 0} />
                <Linha k="Valor do próximo ciclo" v={fmtMoney(Math.round(parseMoney(dados.mensalidadePendente || dados.mensalidade)))} />
                <Linha k="Em dívida" v={fmtMoney(divida)} alerta={divida > 0} />
                {dados.pacotePendente && <Linha k="Mudança agendada" v={`${dados.pacotePendente} · ${dados.mensalidadePendente || ""} MT (fim do ciclo)`} />}
                {portal?.lembreteEmail?.due && <Linha k="Último lembrete (email)" v={`venc. ${portal.lembreteEmail.due} · enviado ${fmtDateTime(portal.lembreteEmail.em)}`} />}
                {portal?.lembreteWa?.due && <Linha k="Último lembrete (WhatsApp)" v={`venc. ${portal.lembreteWa.due} · enviado ${fmtDateTime(portal.lembreteWa.em)}`} />}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {vence && <button onClick={() => abrirProximaFatura(dados, vence, cfg.contacts)} className={acao}><FileText size={13} /> Fatura provisória</button>}
                <button onClick={() => abrirExtrato(dados, pags, vence, divida, cfg.contacts)} className={acao}><Printer size={13} /> Imprimir extrato</button>
                <button onClick={() => { setTab("extrato"); abrirReg(); }} className={acao}><Plus size={13} /> Registar pagamento</button>
              </div>
            </>
          )}

          {tab === "kits" && (
            kits.length === 0 ? <p className="text-faint text-sm">Sem kit alocado.</p> : kits.map((k) => {
              const sl = starlinkOf(k);
              const rows: [string, string][] = [
                ["Pacote", String(k.pacote || "—")],
                ["Mensalidade (cliente)", k.mensalidade ? fmtMoney(parseMoney(k.mensalidade)) : "—"],
                ["Custo Starlink", sl?.amount ? String(sl.amount) : "—"],
                ["Margem mensal", fmtMoney(margemMensal(k))],
                ["Estado kit", String(k.estado || "—")],
                ["Kit / série", String(k.kitSerial || sl?.kitSerial || "—")],
                ["Conta Starlink", String(sl?.accountId || k.conta || "—")],
                ["Vencimento Starlink", String(sl?.dueDate || "—")],
                ["Dia de pagamento", k.diaPagamento ? `Dia ${k.diaPagamento}` : "—"],
              ];
              return (
                <div key={k.id} className="mb-4 last:mb-0">
                  {rows.map(([rk, rv]) => (
                    <div key={rk} className="flex justify-between gap-4 py-2 border-b border-line/60 last:border-0">
                      <span className="text-muted text-sm">{rk}</span><span className="text-fg text-sm text-right">{rv}</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {tab === "extrato" && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={reg ? () => setReg(false) : abrirReg} className={acao}><Plus size={13} /> Registar pagamento</button>
                <button onClick={() => abrirExtrato(dados, pags, vence, divida, cfg.contacts)} className={acao}><Printer size={13} /> Imprimir extrato</button>
              </div>
              {msg && <div className="text-sm text-accent mb-3">{msg}</div>}
              {reg && (
                <div className="border border-line bg-bg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={label}>Mês (YYYY-MM)</label><input className={input} value={mes} onChange={(e) => setMes(e.target.value)} placeholder="2026-07" /></div>
                    <div><label className={label}>Valor (MT)</label><input className={input} value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" /></div>
                  </div>
                  <div><label className={label}>Método</label>
                    <select className={input} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                      {["M-Pesa", "e-Mola", "Numerário", "Banco", "Outro"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <button onClick={registar} disabled={saving} className="w-full bg-fg text-bg py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-50">
                    {saving ? "A guardar…" : "Guardar pagamento"}
                  </button>
                </div>
              )}
              {pags.length === 0 ? <p className="text-faint text-sm">Sem pagamentos.</p> : (
                <div className="divide-y divide-[var(--line)]">
                  {pags.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <div className="text-fg text-sm font-medium">{fmtMoney(parseMoney(p.valor))}</div>
                        <div className="text-faint text-xs">{[p.mes, p.metodo, p.tipo].filter(Boolean).join(" · ")} · {fmtDateTime(p.data)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {aprovado(p) && (
                          <button onClick={() => abrirFatura(p, dados, cfg.contacts)} title="Ver / imprimir fatura" className={miniBtn}>
                            <FileText size={12} /> Fatura
                          </button>
                        )}
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${estadoPillCls(String(p.estado || ""))}`}>{p.estado || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "contrato" && (
            <>
              {cts.length === 0 ? (
                <p className="text-faint text-sm mb-4">Sem contrato registado — a impressão usa os dados atuais do cliente e o texto padrão da config.</p>
              ) : (
                <div className="divide-y divide-[var(--line)] mb-4">
                  {cts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <div className="text-fg text-sm font-medium">{c.numero || "—"}</div>
                        <div className="text-faint text-xs">{[c.pacote, c.mensalidade ? `${c.mensalidade} MT` : "", c.dataInicio || fmtDateTime(c.createdAt)].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => imprimirContrato(c, dados, cfg.contract, cfg.contacts)} title="Imprimir contrato" className={miniBtn}>
                          <Printer size={12} /> Imprimir
                        </button>
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${estadoPillCls(String(c.estado || ""))}`}>{c.estado || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cts.length === 0 && (
                <button onClick={() => imprimirContrato(null, dados, cfg.contract, cfg.contacts)} className={acao}>
                  <Printer size={13} /> Imprimir contrato
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label: l, value, sub, alerta }: { label: string; value: string; sub?: string; alerta?: boolean }) {
  return (
    <div className={`border p-4 ${alerta ? "border-[#ff6b6b]/40 bg-[#ff6b6b]/10" : "border-line bg-card"}`}>
      <div className="text-faint text-[10px] font-mono uppercase tracking-widest">{l}</div>
      <div className={`font-display text-lg leading-tight mt-1 ${alerta ? "text-[#ff6b6b]" : "text-fg"}`}>{value}</div>
      {sub ? <div className={`text-[11px] mt-0.5 ${alerta ? "text-[#ff6b6b]" : "text-muted"}`}>{sub}</div> : null}
    </div>
  );
}

function Linha({ k, v, alerta }: { k: string; v: string; alerta?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-line/60 last:border-0">
      <span className="text-muted text-sm">{k}</span>
      <span className={`text-sm text-right ${alerta ? "text-[#ff6b6b]" : "text-fg"}`}>{v}</span>
    </div>
  );
}
