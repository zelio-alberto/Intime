// Registar pagamento: cola o SMS do M-Pesa/e-Mola, o painel extrai código,
// valor, número e data, encontra a conta pelo telefone, aplica a regra de
// renovação (cicloInicio = max(vencimento, data do pagamento) — igual à
// FichaCliente/portal) e grava em `pagamentos` — APROVANDO o pendente que o
// portal já tenha criado (sem duplicar), ou criando um novo. Faz à mão o que o
// "casador" do servidor faria quando o gateway adormece (ver notas internas).
//
// CUIDADO com o valor: o SMS vem em formato americano ("3,000.00MT" = 3000).
// O parseMoney do admin lê à europeia e daria 3 — por isso há parseValorSms.
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { input, label, pageTitle, pageSub } from "./ui";
import { fmtMoney, parseMoney, monthKey, logMov } from "./gestaoUtils";
import { Search, CheckCircle2, AlertTriangle, User, Wand2, Loader2, Phone } from "lucide-react";

const DAY = 86400000;
const METODOS = ["M-Pesa", "e-Mola", "Banco", "Numerário", "Outro"];
type Cli = { id: string } & DocumentData;
type Pag = { id: string } & DocumentData;

const aprovado = (p: DocumentData) => { const e = String(p.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); };
const tsToDate = (v: unknown): Date | null => {
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (v && typeof (v as DocumentData)._seconds === "number") return new Date((v as DocumentData)._seconds * 1000);
  return null;
};
const only = (s: unknown) => String(s || "").replace(/\D/g, "");
const last9 = (s: unknown) => { const d = only(s); return d.length > 9 ? d.slice(-9) : d; };
const normCod = (s: unknown) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtDia = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

// Valor no formato do SMS (vírgula = milhares, ponto = decimal). "3,000.00" -> 3000.
function parseValorSms(raw: string): number {
  const n = parseFloat(String(raw || "").replace(/,/g, "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

type Parsed = { codigo: string; valor: number; numero: string; nome: string; data: Date | null };

function parseSms(txt: string): Parsed {
  const t = txt.replace(/\s+/g, " ").trim();
  const mCod = t.match(/\b(?:confirmad[oa]|id da transac[aã]o[:\s]*)\s*([A-Z0-9]{6,})/i);
  const mVal = t.match(/(?:recebeste|recebido|recebeu)\s*([\d.,]+)\s*MT/i) || t.match(/([\d.,]+)\s*MT/i);
  const mNum = t.match(/\bde\s+(\d{9,13})\b/i) || t.match(/\b(\d{12,13})\b/);
  const mNome = t.match(/\d{9,13}\s*[-–]\s*([A-Za-zÀ-ÿ'. ]+?)\s+(?:aos|no dia|em|as|às)\b/i);
  const mData = t.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\D{0,6}?(\d{1,2}:\d{2})\s*(AM|PM)?)?/i);

  let data: Date | null = null;
  if (mData) {
    const [dd, mm, yyRaw] = mData[1].split("/").map((x) => parseInt(x, 10));
    let yy = yyRaw; if (yy < 100) yy += 2000;
    let hh = 0, min = 0;
    if (mData[2]) {
      const [h, m] = mData[2].split(":").map((x) => parseInt(x, 10)); hh = h; min = m;
      const ap = (mData[3] || "").toUpperCase();
      if (ap === "PM" && hh < 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
    }
    const d = new Date(yy, (mm || 1) - 1, dd || 1, hh, min);
    if (!isNaN(d.getTime())) data = d;
  }
  return {
    codigo: mCod ? mCod[1].toUpperCase() : "",
    valor: parseValorSms(mVal ? mVal[1] : ""),
    numero: mNum ? mNum[1] : "",
    nome: mNome ? mNome[1].trim() : "",
    data,
  };
}

type Conta = { numeroConta: string; nome: string; clienteId: string; mensalidade: number; fones: string[]; last4: string };

export default function RegistarPagamento() {
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [portais, setPortais] = useState<Cli[]>([]);
  const [pagamentos, setPagamentos] = useState<Pag[]>([]);
  const [kits, setKits] = useState<Cli[]>([]);
  const [loading, setLoading] = useState(true);

  const [modo, setModo] = useState<"sms" | "manual">("sms");
  const [texto, setTexto] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [codigo, setCodigo] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [metodo, setMetodo] = useState("M-Pesa");
  const [dataStr, setDataStr] = useState(""); // yyyy-mm-dd (modo manual); vazio = hoje
  const [contaSel, setContaSel] = useState("");
  const [busca, setBusca] = useState("");
  const [meses, setMeses] = useState(1);

  // Troca de modo: limpa o que foi lido/escrito para não misturar.
  const trocarModo = (m: "sms" | "manual") => {
    setModo(m); setErro(""); setDone("");
    setParsed(null); setTexto(""); setCodigo(""); setValorStr(""); setContaSel(""); setBusca(""); setMeses(1);
    setMetodo("M-Pesa"); setDataStr("");
  };
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [erro, setErro] = useState("");

  const carregar = async () => {
    try {
      const [cs, ps, pg, ks] = await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "portalContas")),
        getDocs(collection(db, "pagamentos")),
        getDocs(collection(db, "kits")),
      ]);
      setClientes(cs.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPortais(ps.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPagamentos(pg.docs.map((d) => ({ id: d.id, ...d.data() })));
      setKits(ks.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setErro("Não foi possível carregar os dados (ver quota do Firestore).");
    } finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  // Lista de contas (portalContas por cima; junta o cliente p/ telefones/nome).
  const contas = useMemo<Conta[]>(() => {
    const cliPorId = new Map<string, Cli>(clientes.map((c) => [c.id, c] as [string, Cli]));
    const cliPorConta = new Map<string, Cli>();
    for (const c of clientes) { const n = String(c.numeroConta || c.conta || ""); if (n) cliPorConta.set(n, c); }
    const out: Conta[] = [];
    const vistos = new Set<string>();
    for (const p of portais) {
      const numeroConta = String(p.numeroConta || p.id);
      if (!numeroConta || vistos.has(numeroConta)) continue; vistos.add(numeroConta);
      const cli = (p.clienteId && cliPorId.get(String(p.clienteId))) || cliPorConta.get(numeroConta);
      const fones = [p.contactoWhatsapp, p.whatsapp, cli?.whatsapp, cli?.telefone, cli?.contactoWhatsapp].filter(Boolean).map(String);
      out.push({
        numeroConta,
        nome: String(p.nome || cli?.nome || numeroConta),
        clienteId: String(p.clienteId || cli?.id || ""),
        mensalidade: parseMoney(p.mensalidade || cli?.mensalidade),
        fones,
        last4: String(p.whatsappLast4 || "").replace(/\D/g, ""),
      });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes, portais]);

  // Ler o SMS e pré-selecionar a conta pelo número.
  const ler = () => {
    setErro(""); setDone("");
    const pr = parseSms(texto);
    setParsed(pr);
    setCodigo(pr.codigo);
    setValorStr(pr.valor ? String(Math.round(pr.valor)) : "");
    setMetodo(/e-?mola/i.test(texto) ? "e-Mola" : "M-Pesa");
    const alvo9 = last9(pr.numero);
    const match = alvo9
      ? contas.find((c) => c.fones.some((f) => last9(f) === alvo9) || (c.last4 && pr.numero.endsWith(c.last4)))
      : undefined;
    setContaSel(match ? match.numeroConta : "");
    setBusca("");
  };

  const conta = contas.find((c) => c.numeroConta === contaSel) || null;
  const valorNum = parseValorSms(valorStr);
  const ativo = modo === "manual" || !!parsed;
  const dataPg = parsed?.data || (dataStr ? new Date(dataStr + "T12:00:00") : new Date());

  // Pagamentos já existentes desta conta (por clienteId ou numeroConta).
  const pagsDaConta = useMemo(() => {
    if (!conta) return [];
    return pagamentos.filter((p) => (conta.clienteId && p.clienteId === conta.clienteId) || (conta.numeroConta && p.numeroConta === conta.numeroConta));
  }, [pagamentos, conta]);

  // Doc já existente com o mesmo código (o portal cria pendente; não duplicar).
  const existente = useMemo(() => {
    if (!codigo) return null;
    const alvo = normCod(codigo);
    return pagsDaConta.find((p) => normCod(p.codigo) === alvo) || pagamentos.find((p) => normCod(p.codigo) === alvo) || null;
  }, [codigo, pagsDaConta, pagamentos]);
  const jaAprovado = !!existente && aprovado(existente);

  // Vencimento atual da conta pela regra oficial (último aprovado +30d).
  const vencAtual = useMemo<Date | null>(() => {
    if (!conta) return null;
    let base: Date | null = null;
    for (const p of pagsDaConta) {
      if (!aprovado(p)) continue;
      const dt = tsToDate(p.cicloInicio) || tsToDate(p.data);
      if (dt && (!base || dt > base)) base = dt;
    }
    if (base) return new Date(base.getTime() + 30 * DAY);
    const portal = portais.find((p) => String(p.numeroConta || p.id) === conta.numeroConta);
    const cli = clientes.find((c) => c.id === conta.clienteId);
    const d = { ...(cli || {}), ...(portal || {}) };
    const act = tsToDate(d.ativadoEm) || tsToDate(d.createdAt);
    if (act) return new Date(act.getTime() + 30 * DAY);
    return tsToDate(d.dueDate);
  }, [conta, pagsDaConta, portais, clientes]);

  // Início do ciclo: se o pendente já traz cicloInicio (portal calculou),
  // respeita-o; senão max(vencimento, data do pagamento).
  const inicio = useMemo<Date>(() => {
    const existenteCiclo = existente ? tsToDate(existente.cicloInicio) : null;
    if (existenteCiclo) return existenteCiclo;
    const vt = vencAtual ? vencAtual.getTime() : dataPg.getTime();
    return new Date(Math.max(vt, dataPg.getTime()));
  }, [existente, vencAtual, dataPg]);

  const nMeses = existente ? 1 : Math.max(1, meses);
  const renova = new Date(inicio.getTime() + nMeses * 30 * DAY);

  // No modo manual, sugere a mensalidade da conta ao escolhê-la (só se vazio).
  useEffect(() => {
    if (modo === "manual" && conta && !valorStr && conta.mensalidade > 0) setValorStr(String(Math.round(conta.mensalidade)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta, modo]);

  const podeGravar = !!conta && valorNum > 0 && !jaAprovado && !saving;

  const gravar = async () => {
    if (!conta || !podeGravar) return;
    setSaving(true); setErro(""); setDone("");
    try {
      const kit = kits.find((k) => String(k.clienteId || "") === conta.clienteId);
      if (existente) {
        const temCiclo = !!tsToDate(existente.cicloInicio);
        await updateDoc(doc(db, "pagamentos", existente.id), {
          estado: "Aprovado",
          tipo: existente.tipo || "Mensalidade",
          kitId: existente.kitId || kit?.id || "",
          valor: valorNum,
          metodo: metodo || existente.metodo || "M-Pesa",
          codigo,
          ...(parsed?.numero ? { numeroOrigem: parsed.numero } : {}),
          registadoManual: true,
          autoConfirmado: false,
          confirmadoEm: serverTimestamp(),
          ...(temCiclo ? {} : { cicloInicio: Timestamp.fromDate(inicio) }),
          obs: `Aprovado pelo painel Registar pagamento a partir do SMS M-Pesa (${codigo}).`,
        });
      } else {
        for (let k = 0; k < nMeses; k++) {
          const ciclo = new Date(inicio.getTime() + k * 30 * DAY);
          await addDoc(collection(db, "pagamentos"), {
            kitId: kit?.id || "", clienteId: conta.clienteId, clienteNome: conta.nome, numeroConta: conta.numeroConta,
            mes: monthKey(ciclo), valor: valorNum, metodo, estado: "Aprovado", tipo: "Mensalidade",
            cicloInicio: Timestamp.fromDate(ciclo),
            ...(k === 0 ? { codigo, ...(parsed?.numero ? { numeroOrigem: parsed.numero } : {}) } : {}),
            registadoManual: true, viaPortal: false,
            data: serverTimestamp(),
          });
        }
      }
      const total = valorNum * nMeses;
      await logMov("pagamento",
        `Registo manual (SMS)${existente ? " · aprovou pendente" : nMeses > 1 ? ` · ${nMeses} meses` : ""} · ${fmtMoney(total)} · ${conta.nome} · renova ${fmtDia(renova)} (${codigo || "sem código"})`,
        { clienteId: conta.clienteId, kitId: kit?.id, valor: total });
      setDone(`✓ Registado para ${conta.nome}. Renova a ${fmtDia(renova)}.`);
      setTexto(""); setParsed(null); setCodigo(""); setValorStr(""); setContaSel(""); setMeses(1);
      await carregar();
    } catch {
      setErro("Erro ao gravar. Tente de novo.");
    } finally { setSaving(false); }
  };

  const listaContas = contas.filter((c) => {
    const b = busca.trim().toLowerCase();
    return !b || c.nome.toLowerCase().includes(b) || c.numeroConta.toLowerCase().includes(b);
  });

  return (
    <div className="max-w-3xl">
      <h1 className={pageTitle}>Registar pagamento</h1>
      <p className={pageSub}>Cole o SMS de confirmação do M-Pesa/e-Mola. O painel lê os dados, encontra a conta e aplica a regra dos 30 dias — aprovando o pendente do portal ou criando um novo registo.</p>

      {done && <div className="flex items-center gap-2 border border-accent bg-accent/10 text-accent px-4 py-3 text-sm mb-6"><CheckCircle2 size={16} /> {done}</div>}
      {erro && <div className="flex items-center gap-2 border border-[#ff6b6b]/50 bg-[#ff6b6b]/10 text-[#ff6b6b] px-4 py-3 text-sm mb-6"><AlertTriangle size={16} /> {erro}</div>}

      {/* Modo: ler SMS ou registar à mão (depósito, numerário, e-Mola sem SMS…) */}
      <div className="inline-flex border border-line mb-5">
        {([["sms", "Tenho SMS"], ["manual", "Registo manual"]] as const).map(([m, l]) => (
          <button key={m} onClick={() => trocarModo(m)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] transition-colors ${modo === m ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>{l}</button>
        ))}
      </div>

      {modo === "sms" && (
        <div className="border border-line bg-card p-5 md:p-6 mb-5">
          <label className={label}>SMS do pagamento</label>
          <textarea
            value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
            placeholder="Ex.: Confirmado DJR5M3X1QVJ. Recebeste 3,000.00MT de 258848927702 - DANIEL aos 27/10/26 as 6:49 PM..."
            className={`${input} font-mono text-xs leading-relaxed resize-y`} />
          <div className="flex justify-end mt-3">
            <button onClick={ler} disabled={!texto.trim()} className="inline-flex items-center gap-2 bg-fg text-bg px-5 py-2.5 text-xs font-mono uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-40">
              <Wand2 size={14} /> Ler SMS
            </button>
          </div>
        </div>
      )}

      {ativo && (
        <>
          {/* 2. Dados (editáveis) */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-line bg-card p-5 md:p-6 mb-5">
            <div>
              <label className={label}>Código (ref.)</label>
              <input className={`${input} font-mono`} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder={modo === "manual" ? "opcional" : "—"} />
            </div>
            <div>
              <label className={label}>Valor (MT)</label>
              <input className={input} value={valorStr} onChange={(e) => setValorStr(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
            <div>
              <label className={label}>Método</label>
              <select className={input} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Pago em</label>
              {parsed?.data
                ? <div className={`${input} text-muted`}>{parsed.data.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                : <input type="date" className={input} value={dataStr} onChange={(e) => setDataStr(e.target.value)} />}
            </div>
            {(parsed?.numero || parsed?.nome || !valorNum) && (
              <div className="sm:col-span-2 lg:col-span-4 text-xs text-faint flex flex-wrap gap-x-5 gap-y-1">
                {parsed?.numero && <span className="inline-flex items-center gap-1.5"><Phone size={12} /> {parsed.numero}</span>}
                {parsed?.nome && <span>Nome no SMS: <b className="text-muted">{parsed.nome}</b></span>}
                {!valorNum && <span className="text-[#ff6b6b]">⚠ indique o valor</span>}
              </div>
            )}
          </div>

          {/* 3. Conta */}
          <div className="border border-line bg-card p-5 md:p-6 mb-5">
            <label className={label}>Conta do cliente</label>
            {conta && (
              <div className="flex items-center gap-3 border border-accent/40 bg-accent/[0.06] px-4 py-3 mb-3">
                <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><User size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-fg font-medium truncate">{conta.nome}</div>
                  <div className="text-faint text-xs">{conta.numeroConta}{conta.mensalidade ? ` · ${fmtMoney(conta.mensalidade)}` : ""}</div>
                </div>
                <button onClick={() => setContaSel("")} className="text-xs text-muted hover:text-accent">trocar</button>
              </div>
            )}
            {!conta && (
              <>
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar conta ou nome…" className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
                </div>
                {loading ? <p className="text-muted text-sm py-4">A carregar contas…</p> : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-[var(--line)] border border-line">
                    {listaContas.map((c) => (
                      <button key={c.numeroConta} onClick={() => setContaSel(c.numeroConta)} className="w-full text-left px-4 py-3 hover:bg-card/60 transition-colors flex items-center gap-3">
                        <div className="w-8 h-8 grid place-items-center border border-line text-accent shrink-0"><User size={14} /></div>
                        <div className="min-w-0 flex-1"><div className="text-fg text-sm truncate">{c.nome}</div><div className="text-faint text-xs">{c.numeroConta}</div></div>
                      </button>
                    ))}
                    {listaContas.length === 0 && <p className="text-faint text-sm text-center py-6">Nenhuma conta encontrada.</p>}
                  </div>
                )}
                {parsed.numero && <p className="text-faint text-xs mt-2">Não encontrámos conta com o número {parsed.numero} — escolha manualmente.</p>}
              </>
            )}
          </div>

          {/* 4. Pré-visualização + gravar */}
          {conta && (
            <div className="border border-line bg-card p-5 md:p-6">
              {jaAprovado ? (
                <div className="flex items-center gap-2 text-[#ff6b6b] text-sm mb-4"><AlertTriangle size={16} /> Este pagamento ({codigo}) já está registado e aprovado — nada a fazer.</div>
              ) : existente ? (
                <div className="flex items-center gap-2 text-accent text-sm mb-4"><CheckCircle2 size={16} /> O portal já criou este pagamento (pendente). Vai ser <b>aprovado</b> — sem duplicar.</div>
              ) : (
                <div className="text-muted text-sm mb-4">Vai criar um <b className="text-fg">novo</b> registo aprovado.</div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <Mini k="Valor" v={valorNum ? fmtMoney(valorNum) : "—"} />
                <Mini k="Início do ciclo" v={fmtDia(inicio)} />
                <Mini k="Renova a" v={fmtDia(renova)} accent />
                <Mini k="Vencimento atual" v={vencAtual ? fmtDia(vencAtual) : "—"} />
              </div>

              {!existente && (
                <div className="flex items-center gap-3 mb-5">
                  <label className="text-xs text-muted">Meses (adiantamento)</label>
                  <select value={meses} onChange={(e) => setMeses(parseInt(e.target.value, 10))} className="bg-bg border border-line px-3 py-2 text-sm text-fg outline-none focus:border-accent">
                    {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {meses > 1 && <span className="text-xs text-faint">{meses} docs encadeados (+30d cada) · total {fmtMoney(valorNum * meses)}</span>}
                </div>
              )}

              <button onClick={gravar} disabled={!podeGravar} className="inline-flex items-center gap-2 bg-fg text-bg px-6 py-3 text-xs font-mono uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {existente ? "Aprovar pagamento" : "Registar pagamento"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Mini({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="border border-line p-4">
      <div className={`font-display text-xl leading-none mb-1 ${accent ? "text-accent" : "text-fg"}`}>{v}</div>
      <div className="text-[11px] text-muted">{k}</div>
    </div>
  );
}
