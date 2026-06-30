import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, onSnapshot, query, where, orderBy, getDocs, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtMoney, parseMoney, starlinkOf, margemMensal, fmtDateTime, estadoPillCls } from "./gestaoUtils";
import { Search, X, User, Wifi, Receipt } from "lucide-react";

type Cli = { id: string } & DocumentData;

export default function Clientes() {
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Cli | null>(null);

  useEffect(() => {
    const u = onSnapshot(query(collection(db, "clientes"), orderBy("createdAt", "desc")),
      (s) => { setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false));
    return () => u();
  }, []);

  const lista = useMemo(() => clientes.filter((c) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return [c.nome, c.numeroConta, c.whatsapp, c.cidade, c.bairro, c.email, c.nomeEmpresa].some((v) => String(v || "").toLowerCase().includes(b));
  }), [clientes, busca]);

  const stats = [
    { label: "Clientes", value: clientes.length },
    { label: "Activos", value: clientes.filter((c) => String(c.estado || "").toLowerCase().includes("activ") || String(c.estado || "").toLowerCase().includes("ativ")).length, accent: true },
    { label: "Empresas", value: clientes.filter((c) => c.tipo === "empresa").length },
  ];

  return (
    <div>
      <h1 className={pageTitle}>Clientes</h1>
      <p className="text-muted text-sm mb-8">Todos os clientes Intime. Toque numa linha para ver a ficha, subscrição e pagamentos.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`border p-6 ${s.accent ? "border-accent bg-accent/[0.05]" : "border-line bg-card"}`}>
            <div className={`font-display text-4xl leading-none mb-1 ${s.accent ? "text-accent" : "text-fg"}`}>{s.value}</div>
            <div className="text-[12.5px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-5 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por nome, conta, WhatsApp, cidade…"
          className="w-full bg-bg border border-line pl-9 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent transition-colors" />
      </div>

      <div className="border border-line bg-card">
        <div className="hidden md:grid grid-cols-[1.4fr_auto_1fr_auto] gap-4 px-6 py-3 border-b border-line text-faint text-[11px] font-mono uppercase tracking-widest">
          <span>Nome</span><span>Conta</span><span>Local · contacto</span><span>Estado</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm px-6 py-12 text-center">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-faint text-sm px-6 py-14 text-center">Nenhum cliente.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {lista.map((c) => (
              <button key={c.id} onClick={() => setSel(c)} className="w-full text-left grid md:grid-cols-[1.4fr_auto_1fr_auto] gap-2 md:gap-4 px-6 py-4 md:items-center hover:bg-card/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 grid place-items-center border border-line text-accent shrink-0"><User size={15} /></div>
                  <div className="min-w-0"><div className="text-fg font-medium truncate">{c.nome || "—"}</div><div className="text-faint text-xs truncate">{c.tipo === "empresa" ? (c.nomeEmpresa || "Empresa") : "Particular"}</div></div>
                </div>
                <div className="font-mono text-sm text-muted self-center">{c.numeroConta || "—"}</div>
                <div className="text-muted text-sm self-center truncate">{[c.bairro, c.cidade].filter(Boolean).join(", ") || "—"} · {c.whatsapp || "—"}</div>
                <span className={`justify-self-start md:justify-self-end text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border self-center ${estadoPillCls(String(c.estado || ""))}`}>{c.estado || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {sel && <FichaCliente cli={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function FichaCliente({ cli, onClose }: { cli: Cli; onClose: () => void }) {
  const [kits, setKits] = useState<DocumentData[]>([]);
  const [pags, setPags] = useState<DocumentData[]>([]);

  useEffect(() => {
    (async () => {
      try { const ks = await getDocs(query(collection(db, "kits"), where("clienteId", "==", cli.id))); setKits(ks.docs.map((d) => ({ id: d.id, ...d.data() }))); } catch { /* */ }
      try { const ps = await getDocs(query(collection(db, "pagamentos"), where("clienteId", "==", cli.id), orderBy("data", "desc"))); setPags(ps.docs.map((d) => ({ id: d.id, ...d.data() }))); }
      catch { try { const ps = await getDocs(query(collection(db, "pagamentos"), where("clienteId", "==", cli.id))); setPags(ps.docs.map((d) => ({ id: d.id, ...d.data() }))); } catch { /* */ } }
    })();
  }, [cli.id]);

  const info: [string, string][] = [
    ["Tipo", cli.tipo === "empresa" ? "Empresa" : "Particular"],
    ["Conta", String(cli.numeroConta || "—")],
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
  ];

  return (
    <div className="fixed inset-0 z-[400] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full bg-bg border-l border-line overflow-y-auto">
        <div className="sticky top-0 bg-bg/95 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl text-fg">{cli.nome || "—"}</div>
            <div className="text-faint text-xs font-mono">{cli.numeroConta || ""}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center border border-line text-muted hover:text-fg"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-6">
          <Bloco icon={User} titulo="Dados">
            <div className="grid sm:grid-cols-2 gap-x-6">
              {info.map(([k, v]) => (
                <div key={k} className="py-2.5 border-b border-line/60">
                  <div className="text-faint text-[11px] font-mono uppercase tracking-widest">{k}</div>
                  <div className="text-fg text-sm mt-0.5 break-words">{v}</div>
                </div>
              ))}
            </div>
          </Bloco>

          <Bloco icon={Wifi} titulo="Subscrição / Starlink">
            {kits.length === 0 ? <p className="text-faint text-sm">Sem kit alocado.</p> : kits.map((k) => {
              const sl = starlinkOf(k);
              const margem = margemMensal(k);
              const rows: [string, string][] = [
                ["Pacote", String(k.pacote || "—")],
                ["Mensalidade (cliente)", k.mensalidade ? fmtMoney(parseMoney(k.mensalidade)) : "—"],
                ["Custo Starlink", sl?.amount ? String(sl.amount) : "—"],
                ["Margem mensal", fmtMoney(margem)],
                ["Estado kit", String(k.estado || "—")],
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
            })}
          </Bloco>

          <Bloco icon={Receipt} titulo={`Pagamentos (${pags.length})`}>
            {pags.length === 0 ? <p className="text-faint text-sm">Sem pagamentos.</p> : (
              <div className="divide-y divide-[var(--line)]">
                {pags.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-fg text-sm font-medium">{fmtMoney(parseMoney(p.valor))}</div>
                      <div className="text-faint text-xs">{[p.mes, p.metodo, p.tipo].filter(Boolean).join(" · ")} · {fmtDateTime(p.data)}</div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border shrink-0 ${estadoPillCls(String(p.estado || ""))}`}>{p.estado || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Bloco>
        </div>
      </div>
    </div>
  );
}

function Bloco({ icon: Ic, titulo, children }: { icon: typeof User; titulo: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-card p-5">
      <div className="flex items-center gap-2 font-display text-lg text-fg mb-4"><Ic size={17} className="text-accent" /> {titulo}</div>
      {children}
    </div>
  );
}
