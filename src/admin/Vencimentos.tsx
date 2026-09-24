// Painel "Próximos pagamentos": vencimento de todas as contas pela regra
// oficial (último pagamento aprovado +30d — a mesma da FichaCliente e do
// portal), com totais, filtros e ações rápidas (WhatsApp, fatura, ficha).
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, Timestamp, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, parseMoney } from "./gestaoUtils";
import { useSiteConfig } from "../useSiteConfig";
import { abrirProximaFatura } from "./documentos";
import FichaCliente from "./FichaCliente";
import { MessageCircle, FileText, User } from "lucide-react";

const DAY = 86400000;
type Cli = { id: string } & DocumentData;

export type Venc = {
  conta: string; clienteId: string; nome: string; estado: string; base: string;
  mensalidade: number; corrigida: boolean; vence: Date | null; dias: number | null;
  whatsapp: string; dados: DocumentData;
};

const aprovado = (p: DocumentData) => { const e = String(p.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); };
const tsToDate = (v: unknown): Date | null => {
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
};
const pagMs = (p: DocumentData) => (p.data instanceof Timestamp ? p.data.toMillis() : 0);

function calcular(portais: Cli[], clientes: Cli[], pagamentos: DocumentData[]): Venc[] {
  const cliPorConta = new Map<string, Cli>();
  for (const c of clientes) { const n = String(c.numeroConta || c.conta || ""); if (n) cliPorConta.set(n, c); }
  const pagsPorConta = new Map<string, DocumentData[]>();
  for (const p of pagamentos) {
    const n = String(p.numeroConta || ""); if (!n) continue;
    const arr = pagsPorConta.get(n) || []; arr.push(p); pagsPorConta.set(n, arr);
  }

  const out: Venc[] = [];
  for (const portal of portais) {
    const conta = String(portal.numeroConta || portal.id);
    const cli = cliPorConta.get(conta);
    const d: DocumentData = { ...(cli || {}), ...portal, numeroConta: conta };

    const estado = String(d.estado || "").toLowerCase();
    if (estado.includes("cancel") || estado.includes("suspens")) continue;

    // último pagamento aprovado (mais recente primeiro), como na FichaCliente
    const pags = (pagsPorConta.get(conta) || []).slice().sort((a, b) => pagMs(b) - pagMs(a));
    const aprov = pags.find(aprovado);
    let base: Date | null = null, baseTxt = "";
    if (aprov && (tsToDate(aprov.cicloInicio) || tsToDate(aprov.data))) {
      base = tsToDate(aprov.cicloInicio) || tsToDate(aprov.data); baseTxt = "últ. pagamento";
    } else if (tsToDate(d.ativadoEm)) { base = tsToDate(d.ativadoEm); baseTxt = "ativação"; }
    else if (tsToDate(d.createdAt)) { base = tsToDate(d.createdAt); baseTxt = "criação"; }
    const vence = base ? new Date(base.getTime() + 30 * DAY) : tsToDate(d.dueDate);
    if (!base && vence) baseTxt = "dueDate";
    const dias = vence ? Math.ceil((vence.getTime() - Date.now()) / DAY) : null;

    // guarda p/ mensalidade corrompida (3.5 gravado em vez de 3500)
    let mensal = parseMoney(d.mensalidade);
    const corrigida = mensal > 0 && mensal < 100;
    if (corrigida) mensal *= 1000;

    out.push({
      conta,
      clienteId: String(portal.clienteId || cli?.id || ""),
      nome: String(d.nome || cli?.nome || ""),
      estado: String(d.estado || "—"),
      base: baseTxt, mensalidade: mensal, corrigida, vence, dias,
      whatsapp: String(cli?.whatsapp || cli?.telefone || ""),
      dados: d,
    });
  }

  out.sort((a, b) => {
    if (a.vence && b.vence) return a.vence.getTime() - b.vence.getTime();
    if (a.vence) return -1;
    if (b.vence) return 1;
    return 0;
  });
  return out;
}

/** Vencimentos de todas as contas ativas (tempo real). Também usado no Painel. */
export function useVencimentos() {
  const [portais, setPortais] = useState<Cli[]>([]);
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [pags, setPags] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "portalContas"), (s) => { setPortais(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, "clientes"), (s) => setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    const u3 = onSnapshot(collection(db, "pagamentos"), (s) => setPags(s.docs.map((d) => d.data())), () => {});
    return () => { u1(); u2(); u3(); };
  }, []);

  const linhas = useMemo(() => calcular(portais, clientes, pags), [portais, clientes, pags]);
  return { linhas, clientes, loading };
}

const fmtD = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });

function pill(l: Venc): { txt: string; cls: string } {
  if (l.dias === null) return { txt: "Sem data", cls: "text-muted border-line bg-card/40" };
  if (l.dias < 0) return { txt: `Em atraso ${-l.dias}d`, cls: "text-[#ff6b6b] border-[#ff6b6b]/40 bg-[#ff6b6b]/10" };
  if (l.dias === 0) return { txt: "Vence hoje", cls: "text-accent border-accent/40 bg-accent/10" };
  if (l.dias <= 7) return { txt: `Vence em ${l.dias}d`, cls: "text-accent border-accent/40 bg-accent/10" };
  return { txt: "Em dia", cls: "text-muted border-line bg-card/40" };
}

type Filtro = "todos" | "atraso" | "avencer" | "semdata";

export default function Vencimentos() {
  const cfg = useSiteConfig();
  const { linhas, clientes, loading } = useVencimentos();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [sel, setSel] = useState<Cli | null>(null);

  const atraso = linhas.filter((l) => l.dias !== null && l.dias < 0);
  const aVencer = linhas.filter((l) => l.dias !== null && l.dias >= 0 && l.dias <= 7);
  const semData = linhas.filter((l) => l.vence === null);
  const totalAtraso = atraso.reduce((s, l) => s + l.mensalidade, 0);
  const totalAVencer = aVencer.reduce((s, l) => s + l.mensalidade, 0);
  const totalPrevisto = linhas.filter((l) => l.dias !== null && l.dias >= 0).reduce((s, l) => s + l.mensalidade, 0);
  const temCorrigida = linhas.some((l) => l.corrigida);

  const lista =
    filtro === "atraso" ? atraso :
    filtro === "avencer" ? aVencer :
    filtro === "semdata" ? semData : linhas;

  const filtros: { key: Filtro; label: string }[] = [
    { key: "todos", label: `Todos (${linhas.length})` },
    { key: "atraso", label: `Em atraso (${atraso.length})` },
    { key: "avencer", label: `A vencer ≤7d (${aVencer.length})` },
    { key: "semdata", label: `Sem data (${semData.length})` },
  ];

  const abrirFicha = (l: Venc) => {
    const cli = clientes.find((c) => c.id === l.clienteId) || clientes.find((c) => String(c.numeroConta || "") === l.conta);
    if (cli) setSel(cli);
  };

  const waHref = (l: Venc) => {
    const digits = l.whatsapp.replace(/\D/g, "");
    if (!digits) return "";
    const n = digits.startsWith("258") ? digits : "258" + digits.replace(/^0+/, "");
    const quando = l.vence ? (l.dias !== null && l.dias < 0 ? ` venceu a ${fmtD(l.vence)}` : ` vence a ${fmtD(l.vence)}`) : "";
    const texto = `Olá ${l.nome}! A sua mensalidade Intime${l.mensalidade > 0 ? ` de ${fmtMoney(l.mensalidade)}` : ""}${quando}. Conta ${l.conta}. Obrigado!`;
    return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
  };

  const stats = [
    { label: `Em atraso (${atraso.length})`, value: fmtMoney(totalAtraso, false), danger: atraso.length > 0 },
    { label: `A vencer ≤7 dias (${aVencer.length})`, value: fmtMoney(totalAVencer, false), accent: aVencer.length > 0 },
    { label: "Previsto no ciclo (MT)", value: fmtMoney(totalPrevisto, false) },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Próximos pagamentos</h1>
      <p className="text-muted text-sm mb-8">Quem vence quando, quem está em dívida e quanto vem aí — pela regra dos 30 dias após o último pagamento aprovado.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.danger ? "border-[#ff6b6b]/50 bg-[#ff6b6b]/[0.05]" : s.accent ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-4xl leading-none mb-1 ${s.danger ? "text-[#ff6b6b]" : s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {filtros.map((f) => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-widest border transition-colors ${filtro === f.key ? "border-accent text-accent bg-accent/10" : "border-line text-muted hover:text-fg"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[1.4fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Cliente</span><span>Conta</span><span>Vence</span><span>Mensalidade</span><span>Base</span><span className="justify-self-end">Ações</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhuma conta neste filtro.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((l) => {
              const p = pill(l);
              return (
                <div key={l.conta} className="grid md:grid-cols-[1.4fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 px-6 py-4 md:items-center hover:bg-card/40 transition-colors">
                  <button onClick={() => abrirFicha(l)} className="flex items-center gap-3 min-w-0 text-left">
                    <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><User size={15} /></div>
                    <div className="min-w-0">
                      <div className="text-fg font-medium truncate">{l.nome || l.conta}</div>
                      <span className={`inline-block mt-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border ${p.cls}`}>{p.txt}</span>
                    </div>
                  </button>
                  <div className="font-mono text-sm text-muted self-center">{l.conta}</div>
                  <div className="text-sm text-muted self-center">{l.vence ? fmtD(l.vence) : "—"}</div>
                  <div className="text-sm text-fg self-center">{l.mensalidade > 0 ? `${fmtMoney(l.mensalidade)}${l.corrigida ? " *" : ""}` : "—"}</div>
                  <div className="text-xs text-faint self-center">{l.base || "—"}</div>
                  <div className="flex items-center gap-1.5 md:justify-self-end self-center">
                    {l.whatsapp && (
                      <a href={waHref(l)} target="_blank" rel="noopener" title="Cobrar por WhatsApp"
                        className="w-8 h-8 grid place-items-center border border-line text-[#25D366] hover:border-[#25D366]/50 transition-colors">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {l.vence && (
                      <button onClick={() => abrirProximaFatura(l.dados, l.vence!, cfg.contacts)} title="Fatura do ciclo (PDF pelo diálogo de impressão)"
                        className="w-8 h-8 grid place-items-center border border-line text-muted hover:text-accent hover:border-accent/50 transition-colors">
                        <FileText size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {temCorrigida && (
        <p className="text-faint text-xs mt-3">* mensalidade corrigida automaticamente (valor mal gravado no sistema, ex.: 3.5 → 3.500).</p>
      )}

      {sel && <FichaCliente cli={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
