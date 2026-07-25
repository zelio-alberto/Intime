import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { parseMoney, fmtMoney, kitAlocado, starlinkOf } from "./gestaoUtils";
import { TrendingUp, Banknote, PackageMinus, ShieldCheck, Rocket, Lightbulb } from "lucide-react";

// Estratégias para acelerar a recuperação do investimento nos kits.
// O texto é o playbook; os números calculam-se ao vivo dos dados reais
// (kits/pagamentos), para o conselho nunca ficar desatualizado.

const mesesTxt = (n: number) => (isFinite(n) && n > 0 ? `~${Math.ceil(n * 2) / 2} meses`.replace(".5", ",5") : "—");

export default function Estrategias() {
  const [kits, setKits] = useState<DocumentData[]>([]);
  const [pags, setPags] = useState<DocumentData[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "kits"), (s) => setKits(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    const u2 = onSnapshot(collection(db, "pagamentos"), (s) => setPags(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    return () => { u1(); u2(); };
  }, []);

  const n = useMemo(() => {
    const aloc = kits.filter(kitAlocado);
    const media = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0);
    const custoKit = media(aloc.map((k) => parseMoney(k.custoAquisicao)).filter((v) => v > 0)) || 14290;
    const custoSl = media(aloc.map((k) => parseMoney(starlinkOf(k)?.amount)).filter((v) => v > 0)) || 1900;
    const mensal = media(aloc.map((k) => parseMoney(k.mensalidade)).filter((v) => v > 0)) || 3000;
    const recebidoTotal = pags.filter((p) => String(p.estado ?? "Aprovado") === "Aprovado").reduce((s, p) => s + parseMoney(p.valor), 0);
    const margemAtual = mensal - custoSl;
    return { nKits: aloc.length, custoKit, custoSl, mensal, margemAtual, recebidoTotal };
  }, [kits, pags]);

  const cenarios = [
    { nome: "Hoje", mensal: n.mensal, entrada: 0, destaque: false },
    { nome: "Pacote 3.500", mensal: 3500, entrada: 0, destaque: false },
    { nome: "3.500 + entrada 4.000", mensal: 3500, entrada: 4000, destaque: true },
    { nome: "Empresa 6.000 + entrada 4.000", mensal: 6000, entrada: 4000, destaque: false },
  ].map((c) => {
    const margem = c.mensal - n.custoSl;
    return { ...c, margem, payback: margem > 0 ? (n.custoKit - c.entrada) / margem : Infinity };
  });

  const estrategias = [
    {
      icon: TrendingUp, titulo: "1. Subir a margem por cliente (custo zero, efeito imediato)",
      pontos: [
        `Migrar clientes para pacotes maiores: a ${fmtMoney(3500)}/mês a margem passa de ${fmtMoney(n.margemAtual)} para ${fmtMoney(3500 - n.custoSl)} — o payback cai de ${mesesTxt(n.custoKit / n.margemAtual)} para ${mesesTxt(n.custoKit / (3500 - n.custoSl))}.`,
        `Pacotes empresariais: uma empresa paga 5.000–8.000 pelo mesmo kit e o mesmo custo Starlink de ${fmtMoney(n.custoSl)} → payback de 2–5 meses.`,
      ],
    },
    {
      icon: Banknote, titulo: "2. Taxa de adesão/instalação (a alavanca mais subestimada)",
      pontos: [
        `Entrada não-reembolsável de 3.000–5.000 MT no cadastro = 20–35% do kit recuperado NO DIA ZERO. O campo "valor de inscrição" já existe no Novo Cadastro — é só tornar política.`,
        `Com entrada de 4.000 e pacote 3.500, o payback cai para ${mesesTxt((n.custoKit - 4000) / (3500 - n.custoSl))}.`,
      ],
    },
    {
      icon: PackageMinus, titulo: "3. Baixar o custo do kit",
      pontos: [
        `O Starlink Mini tem promoções frequentes (já esteve abaixo de 10.000 MT). Cada 1.000 MT poupados ≈ 1 mês a menos de payback.`,
        `Comprar 2–3 kits em promoção vale mais do que 1 ao preço cheio — mas SÓ com cliente fechado (ver 5).`,
      ],
    },
    {
      icon: ShieldCheck, titulo: "4. Proteger a margem (churn e calote são os assassinos do payback)",
      pontos: [
        `Fidelização de 12 meses no contrato — o kit só se paga ao mês ${Math.ceil(n.custoKit / Math.max(1, n.margemAtual))}; um cliente que sai ao mês 5 deixa um buraco.`,
        `Régua de cobrança sempre ativa: lembrete (email+WhatsApp já funcionam) → aviso → suspensão. Cada mês não recebido adia o payback e a Starlink continua a cobrar ${fmtMoney(n.custoSl)}.`,
        `Kit que fique livre = PAUSAR a subscrição Starlink imediatamente. Kit parado a pagar ${fmtMoney(n.custoSl)}/mês é hemorragia.`,
      ],
    },
    {
      icon: Rocket, titulo: "5. Crescer sem afundar capital",
      pontos: [
        `Nunca comprar kit sem cliente fechado — idealmente com a entrada já paga (o cliente financia parte do kit).`,
        `Regra de reinvestimento: cada cliente gera ${fmtMoney(n.margemAtual)}–${fmtMoney(3500 - n.custoSl)}/mês; com 3–4 clientes a própria margem compra um kit novo a cada 2–3 meses, sem dinheiro fresco.`,
        `Usar os promotores (sistema de afiliados já existe) para angariar sem custo fixo — comissão só quando entra cliente.`,
      ],
    },
  ];

  return (
    <div>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 grid place-items-center border border-accent/40 text-accent shrink-0 mt-1"><Lightbulb size={18} /></div>
        <div>
          <h1 className={pageTitle}>Estratégias</h1>
          <p className="text-muted text-sm">Como acelerar a recuperação do investimento nos kits. Os números atualizam-se sozinhos com os dados reais ({n.nKits} kit{n.nKits === 1 ? "" : "s"} alocado{n.nKits === 1 ? "" : "s"}, kit médio {fmtMoney(n.custoKit)}, Starlink {fmtMoney(n.custoSl)}/mês).</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 my-8">
        <div className="border border-line bg-card p-6">
          <div className="font-display text-2xl text-fg mb-1">{fmtMoney(n.margemAtual)}<span className="text-sm text-muted">/mês</span></div>
          <div className="text-[12.5px] text-muted">Margem atual por cliente ({fmtMoney(n.mensal)} − {fmtMoney(n.custoSl)})</div>
        </div>
        <div className="border border-line bg-card p-6">
          <div className="font-display text-2xl text-fg mb-1">{mesesTxt(n.custoKit / n.margemAtual)}</div>
          <div className="text-[12.5px] text-muted">Payback de um kit ao ritmo atual</div>
        </div>
        <div className="border border-accent bg-accent/[0.05] p-6">
          <div className="font-display text-2xl text-accent mb-1">{mesesTxt((n.custoKit - 4000) / (3500 - n.custoSl))}</div>
          <div className="text-[12.5px] text-muted">Payback com pacote 3.500 + entrada 4.000</div>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        {estrategias.map((e) => (
          <div key={e.titulo} className="border border-line bg-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><e.icon size={16} /></div>
              <h2 className="font-display text-lg text-fg">{e.titulo}</h2>
            </div>
            <ul className="space-y-2 pl-1">
              {e.pontos.map((p, i) => (
                <li key={i} className="text-muted text-sm leading-relaxed flex gap-2.5"><span className="text-accent shrink-0 mt-[1px]">→</span><span>{p}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl text-fg mb-3">Cenários de payback (por kit)</h2>
      <div className="border border-line bg-card overflow-x-auto mb-4">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
            <span>Cenário</span><span className="text-right">Margem/mês</span><span className="text-right">Entrada</span><span className="text-right">Payback</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {cenarios.map((c) => (
              <div key={c.nome} className={`grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center text-sm ${c.destaque ? "bg-accent/[0.05]" : ""}`}>
                <span className={c.destaque ? "text-accent font-medium" : "text-fg"}>{c.nome}{c.destaque ? " ★" : ""}</span>
                <span className="text-right text-fg">{fmtMoney(c.margem)}</span>
                <span className="text-right text-muted">{c.entrada ? fmtMoney(c.entrada) : "—"}</span>
                <span className={`text-right font-medium ${c.destaque ? "text-accent" : "text-fg"}`}>{mesesTxt(c.payback)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-faint text-xs mb-2">Nota: comprar mais kits multiplica o negócio mas não acelera a recuperação — cada kit novo começa o seu próprio ciclo. Primeiro margem e entrada; depois escalar com a regra do ponto 5.</p>
    </div>
  );
}
