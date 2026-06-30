import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { useSiteConfig } from "../useSiteConfig";
import { pageTitle } from "./ui";
import { parseMoney, fmtMoney, monthKey, monthLabel, daysUntil, kitAlocado, starlinkOf, logMov, estadoPillCls } from "./gestaoUtils";
import { MessageCircle, Check, CheckCircle2 } from "lucide-react";

type Kit = { id: string } & DocumentData;
const mes = monthKey();

function mesesAtraso(paid: Set<string>): number {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth() + 1, n = 0;
  while (n < 12) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (paid.has(key)) break;
    n++; m--; if (m === 0) { m = 12; y--; }
  }
  return n;
}

export default function Financas() {
  const cfg = useSiteConfig();
  const [kits, setKits] = useState<Kit[]>([]);
  const [pags, setPags] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"resumo" | "dever" | "starlink" | "rent">("resumo");

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "kits"), (s) => { setKits(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, "pagamentos"), (s) => setPags(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => { u1(); u2(); };
  }, []);

  const calc = useMemo(() => {
    const lifetime: Record<string, number> = {};
    const count: Record<string, number> = {};
    const paidMonths: Record<string, Set<string>> = {};
    let receitaMes = 0, receitaTotal = 0;
    for (const p of pags) {
      if ((p.estado ?? "Aprovado") !== "Aprovado") continue;
      const kid = String(p.kitId ?? "");
      const v = parseMoney(p.valor);
      lifetime[kid] = (lifetime[kid] || 0) + v;
      count[kid] = (count[kid] || 0) + 1;
      (paidMonths[kid] ??= new Set()).add(String(p.mes ?? ""));
      receitaTotal += v;
      if (p.mes === mes) receitaMes += v;
    }
    const atrasoDe = (id: string) => mesesAtraso(paidMonths[id] ?? new Set());
    const pagouMes = (id: string) => (paidMonths[id] ?? new Set()).has(mes);
    const starlinkPorPagar = (d: DocumentData) => {
      const sl = starlinkOf(d); if (!sl) return false;
      const s = String(sl.status ?? "").toLowerCase();
      const crit = s.includes("por pagar") || s.includes("falh") || s.includes("suspens");
      const dias = daysUntil(String(sl.dueDate ?? ""));
      return crit || (dias != null && dias <= 7);
    };

    const alocadas = kits.filter((k) => kitAlocado(k));
    const prevista = alocadas.reduce((s, k) => s + parseMoney(k.mensalidade), 0);
    // Custo recorrente: o que a Intime paga à Starlink por mês (kits alocados).
    const custoStarlinkMes = alocadas.reduce((s, k) => s + parseMoney(starlinkOf(k)?.amount), 0);
    const emAtraso = alocadas.filter((k) => atrasoDe(k.id) >= 1).sort((a, b) => atrasoDe(b.id) - atrasoDe(a.id));
    let divida = 0, b30 = 0, b60 = 0, b90 = 0;
    for (const k of emAtraso) {
      divida += parseMoney(k.mensalidade);
      const ma = atrasoDe(k.id);
      if (ma >= 4) b90++; else if (ma >= 3) b60++; else if (ma >= 2) b30++;
    }
    const aPagarStarlink = alocadas.filter((k) => pagouMes(k.id) && starlinkPorPagar(k) && k.starlinkPagoMes !== mes);
    const aguardamCliente = alocadas.filter((k) => starlinkPorPagar(k) && !pagouMes(k.id));
    const porReceita = [...kits].sort((a, b) => (lifetime[b.id] || 0) - (lifetime[a.id] || 0));

    return { lifetime, count, paidMonths, receitaMes, receitaTotal, prevista, custoStarlinkMes, emAtraso, divida, b30, b60, b90, aPagarStarlink, aguardamCliente, porReceita, atrasoDe };
  }, [kits, pags]);

  const waNum = (cfg.contacts.whatsapp || "").replace(/\D/g, "");
  const lembrar = (k: Kit) => {
    const wa = String(k.whatsapp || "").replace(/\D/g, "") || waNum;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`Olá ${k.cliente || ""}! Lembrete da mensalidade Intime.`)}`, "_blank");
  };
  const marcarPagoStarlink = async (k: Kit) => {
    try {
      await updateDoc(doc(db, "kits", k.id), { starlinkPagoMes: mes });
      await logMov("estado", `Plano Starlink pago à Starlink (${monthLabel(mes)})`, { kitId: k.id, clienteId: String(k.clienteId || "") });
    } catch { /* */ }
  };
  const nomeKit = (k: Kit) => (String(k.cliente || "").length ? k.cliente : (k.conta || "Starlink"));

  const tabs = [
    { k: "resumo", l: "Resumo" },
    { k: "dever", l: `A dever (${calc.emAtraso.length})` },
    { k: "starlink", l: `Pagar Starlink (${calc.aPagarStarlink.length})` },
    { k: "rent", l: "Rentabilidade" },
  ] as const;

  return (
    <div>
      <h1 className={pageTitle}>Finanças</h1>
      <p className="text-muted text-sm mb-6">Receita, dívidas e pagamentos à Starlink — {monthLabel(mes)}.</p>

      <div className="flex gap-2 mb-6 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-3 text-[11px] font-mono uppercase tracking-[0.15em] border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.k ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>{t.l}</button>
        ))}
      </div>

      {loading ? <p className="text-muted text-sm py-12 text-center">A carregar…</p> : (
        <>
          {tab === "resumo" && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-6 md:p-8 rounded-2xl text-white bg-gradient-to-br from-[#0A0C10] to-[#12303A] border border-line">
                <div className="text-white/70 text-sm">Recebido em {monthLabel(mes)}</div>
                <div className="font-display text-4xl md:text-5xl font-bold mt-1">{fmtMoney(calc.receitaMes)}</div>
                <div className="text-white/50 text-sm">de {fmtMoney(calc.prevista)} previstos</div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[[fmtMoney(calc.receitaTotal), "Receita total"], [String(calc.emAtraso.length), "A dever"], [fmtMoney(calc.divida), "Em dívida"]].map(([v, l]) => (
                    <div key={l}><div className="text-lg font-bold">{v}</div><div className="text-white/60 text-xs">{l}</div></div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-white/10 text-sm space-y-1">
                  <div className="flex justify-between text-white/70"><span>Pago à Starlink / mês (previsto)</span><span>−{fmtMoney(calc.custoStarlinkMes)}</span></div>
                  <div className="flex justify-between font-bold"><span>Margem prevista / mês</span><span className={calc.prevista - calc.custoStarlinkMes >= 0 ? "text-accent" : "text-[#ff6b6b]"}>{fmtMoney(calc.prevista - calc.custoStarlinkMes)}</span></div>
                </div>
              </div>
              <div>
                <div className="text-muted text-sm font-medium mb-3">Escalões de atraso</div>
                <div className="grid grid-cols-3 gap-3">
                  {([["+30 dias", calc.b30, false], ["+60 dias", calc.b60, false], ["+90 dias", calc.b90, true]] as const).map(([l, n, crit]) => (
                    <div key={l} className={`border p-4 text-center ${n > 0 ? (crit ? "border-[#ff6b6b]/50 text-[#ff6b6b]" : "border-[#E0A800]/50 text-[#E0A800]") : "border-line text-muted"}`}>
                      <div className="text-2xl font-display font-bold">{n}</div><div className="text-xs text-muted">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "dever" && (
            <div className="space-y-3 max-w-3xl">
              {calc.emAtraso.length === 0 ? (
                <div className="border border-line bg-card p-5 flex items-center gap-3 text-muted"><CheckCircle2 size={18} className="text-accent" /> Ninguém em dívida. Tudo em dia.</div>
              ) : calc.emAtraso.map((k) => {
                const ma = calc.atrasoDe(k.id); const risco = ma >= 3;
                return (
                  <div key={k.id} className="border border-line bg-card p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-fg font-medium truncate">{nomeKit(k)}</div>
                      <div className="text-muted text-xs">{k.pacote || ""} · {fmtMoney(parseMoney(k.mensalidade))}/mês</div>
                      <div className={`text-xs ${risco ? "text-[#ff6b6b]" : "text-faint"}`}>em atraso há {ma} mês(es){risco ? " — risco de recolha" : ""}</div>
                    </div>
                    <button onClick={() => lembrar(k)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-[#20bd5a] transition-colors shrink-0"><MessageCircle size={14} /> Lembrar</button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "starlink" && (
            <div className="space-y-3 max-w-3xl">
              <h3 className="font-display text-xl text-fg">Cliente já pagou — pague à Starlink</h3>
              <p className="text-muted text-sm mb-2">Já pagaram este mês e a Starlink está por pagar. Pode pagar à Starlink.</p>
              {calc.aPagarStarlink.length === 0 ? (
                <div className="border border-line bg-card p-5 flex items-center gap-3 text-muted"><CheckCircle2 size={18} className="text-accent" /> Nada a pagar à Starlink agora.</div>
              ) : calc.aPagarStarlink.map((k) => {
                const sl = starlinkOf(k)!; const dias = daysUntil(String(sl.dueDate ?? ""));
                return (
                  <div key={k.id} className="border border-line bg-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-fg font-medium truncate">{nomeKit(k)}</div>
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${estadoPillCls(String(sl.status || ""))}`}>{sl.status || "—"}</span>
                    </div>
                    <div className="text-muted text-sm">Pagar à Starlink: {sl.amount || "—"}{sl.dueDate ? ` · suspende ${sl.dueDate}${dias != null ? ` (${dias}d)` : ""}` : ""}</div>
                    <button onClick={() => marcarPagoStarlink(k)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#2E9E4F] text-white font-mono text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"><Check size={14} /> Marquei como pago à Starlink</button>
                  </div>
                );
              })}

              {calc.aguardamCliente.length > 0 && (
                <div className="pt-5">
                  <h3 className="font-display text-xl text-fg mb-3">Aguardam o cliente — NÃO pague ainda</h3>
                  {calc.aguardamCliente.map((k) => {
                    const sl = starlinkOf(k)!;
                    return (
                      <div key={k.id} className="border border-line bg-card p-4 flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-fg font-medium truncate">{nomeKit(k)}</div>
                          <div className="text-[#ff6b6b] text-xs">{sl.amount || ""}{sl.dueDate ? ` · suspende ${sl.dueDate}` : ""} — cliente ainda não pagou</div>
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border shrink-0 ${estadoPillCls(String(sl.status || ""))}`}>{sl.status || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "rent" && (
            <div className="space-y-3 max-w-3xl">
              {calc.porReceita.map((k) => {
                const ger = calc.lifetime[k.id] || 0; const cnt = calc.count[k.id] || 0;
                const custoKit = parseMoney(k.custoAquisicao);
                const slMes = parseMoney(starlinkOf(k)?.amount);
                const custoSl = slMes * cnt; // Starlink × meses pagos
                const margemMes = parseMoney(k.mensalidade) - slMes;
                const payback = margemMes > 0 && custoKit > 0 ? Math.ceil(custoKit / margemMes) : null;
                const lucroAcum = ger - custoKit - custoSl;
                return (
                  <div key={k.id} className="border border-line bg-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-fg font-medium truncate">{nomeKit(k)}</div>
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${estadoPillCls(String(k.estado || ""))}`}>{k.estado || (kitAlocado(k) ? "Alugado" : "Livre")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><div className="text-faint text-[11px]">Margem / mês</div><div className="text-accent font-bold">{slMes > 0 || k.mensalidade ? fmtMoney(margemMes) : "—"}</div></div>
                      <div><div className="text-faint text-[11px]">Custo do kit</div><div className="text-fg font-bold">{custoKit > 0 ? fmtMoney(custoKit) : "—"}</div></div>
                      <div><div className="text-faint text-[11px]">Lucro acumulado</div><div className={`font-bold ${lucroAcum >= 0 ? "text-accent" : "text-[#ff6b6b]"}`}>{lucroAcum >= 0 ? "+" : ""}{fmtMoney(lucroAcum)}</div></div>
                    </div>
                    <div className="text-faint text-xs mt-2">Recebeu {fmtMoney(ger)} em {cnt} pag · pago à Starlink {fmtMoney(custoSl)}{payback ? ` · recupera o kit em ~${payback} meses` : ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
