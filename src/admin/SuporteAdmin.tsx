import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp, Timestamp, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { fmtDateTime, logMov } from "./gestaoUtils";
import { RefreshCcw, Check, LifeBuoy, MessageCircle } from "lucide-react";

type Sup = { id: string } & DocumentData;

// Próxima data de pagamento (ciclo de 30 dias) — quando a mudança entra em vigor.
async function proximaDataDe(numeroConta: string, portal: DocumentData): Promise<Date | null> {
  let base: Date | null = null;
  try {
    const ps = await getDocs(query(collection(db, "pagamentos"), where("numeroConta", "==", numeroConta)));
    ps.docs.forEach((d) => {
      const x = d.data() as DocumentData;
      const e = String(x.estado || "").toLowerCase();
      if ((e.includes("aprov") || e.includes("pago")) && x.data instanceof Timestamp) {
        const t = x.data.toDate();
        if (!base || t > base) base = t;
      }
    });
  } catch { /* */ }
  if (!base) {
    if (portal.ativadoEm instanceof Timestamp) base = portal.ativadoEm.toDate();
    else if (portal.createdAt instanceof Timestamp) base = portal.createdAt.toDate();
  }
  if (!base) return null;
  const n = new Date(base); n.setDate(n.getDate() + 30);
  return n;
}

export default function SuporteAdmin() {
  const [sups, setSups] = useState<Sup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"abertos" | "todos">("abertos");
  const [acao, setAcao] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const u = onSnapshot(collection(db, "suporte"), (s) => {
      const arr = s.docs.map((d) => ({ id: d.id, ...d.data() })) as Sup[];
      arr.sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setSups(arr); setLoading(false);
    }, () => setLoading(false));
    return () => u();
  }, []);

  const resolvido = (s: Sup) => String(s.estado || "").toLowerCase().match(/resolv|conclu|agendad|fechad/);
  const lista = useMemo(() => sups.filter((s) => filtro === "todos" || !resolvido(s)), [sups, filtro]);

  const marcar = async (s: Sup, estado: string) => {
    try { await updateDoc(doc(db, "suporte", s.id), { estado }); } catch { /* */ }
  };

  const agendarMudanca = async (s: Sup) => {
    setAcao(s.id); setMsg("");
    try {
      const conta = String(s.numeroConta || "");
      const pcSnap = await getDoc(doc(db, "portalContas", conta));
      const portal = pcSnap.data() || {};
      const desde = await proximaDataDe(conta, portal);
      const pend: DocumentData = {
        pacotePendente: s.pacoteDesejado || "",
        mensalidadePendente: s.mensalidadeNova || "",
        pacotePendenteDesde: desde ? Timestamp.fromDate(desde) : serverTimestamp(),
      };
      await setDoc(doc(db, "portalContas", conta), pend, { merge: true });
      // marca também o(s) kit(s) do cliente
      if (s.clienteId) {
        try {
          const ks = await getDocs(query(collection(db, "kits"), where("clienteId", "==", String(s.clienteId))));
          for (const k of ks.docs) await updateDoc(k.ref, pend);
        } catch { /* */ }
      }
      await updateDoc(doc(db, "suporte", s.id), { estado: "Agendado" });
      await logMov("estado", `Mudança de pacote agendada: ${s.pacoteAtual || "—"} → ${s.pacoteDesejado || "—"} (conta ${conta})`, { clienteId: String(s.clienteId || "") });
      setMsg(`Mudança agendada para ${conta}${desde ? ` a partir de ${desde.toLocaleDateString("pt-PT")}` : ""}.`);
    } catch { setMsg("Erro ao agendar. Tente de novo."); }
    finally { setAcao(null); }
  };

  return (
    <div>
      <h1 className={pageTitle}>Suporte</h1>
      <p className="text-muted text-sm mb-6">Pedidos dos clientes (suporte, mudança de pacote, cancelamento). {sups.length} no total.</p>

      {msg && <div className="border border-line bg-card px-4 py-3 text-sm text-fg mb-4">{msg}</div>}

      <div className="flex gap-2 mb-6">
        {([["abertos", "Abertos"], ["todos", "Todos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.15em] border transition-colors ${filtro === k ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
        ))}
      </div>

      {loading ? <p className="text-muted text-sm py-10 text-center">A carregar…</p> : lista.length === 0 ? (
        <div className="border border-line bg-card p-8 text-center text-faint text-sm">Sem pedidos {filtro === "abertos" ? "abertos" : ""}.</div>
      ) : (
        <div className="space-y-3">
          {lista.map((s) => {
            const mudanca = String(s.tipo || "").toLowerCase().includes("mudan");
            const wa = String(s.whatsapp || "").replace(/\D/g, "");
            return (
              <div key={s.id} className="border border-line bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <LifeBuoy size={16} className="text-accent" />
                      <span className="text-fg font-medium">{s.tipo || "Pedido"}</span>
                      <span className="font-mono text-xs text-faint">{s.numeroConta || ""}</span>
                    </div>
                    <div className="text-faint text-xs mt-1">{fmtDateTime(s.createdAt)}</div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border ${resolvido(s) ? "border-accent/40 text-accent bg-accent/10" : "border-line text-muted"}`}>{s.estado || "Recebido"}</span>
                </div>

                {mudanca ? (
                  <div className="text-sm text-fg mb-3">
                    Muda de <b>{s.pacoteAtual || "—"}</b> para <b>{s.pacoteDesejado || "—"}</b>{s.mensalidadeNova ? ` · novo valor ${s.mensalidadeNova} MT` : ""} <span className="text-faint">(no próximo ciclo)</span>
                  </div>
                ) : (
                  s.descricao && <p className="text-muted text-sm mb-3">{s.descricao}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {mudanca && !resolvido(s) && (
                    <button onClick={() => agendarMudanca(s)} disabled={acao === s.id} className="inline-flex items-center gap-2 px-4 py-2 bg-fg text-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-colors disabled:opacity-50">
                      <RefreshCcw size={13} className={acao === s.id ? "animate-spin" : ""} /> {acao === s.id ? "A agendar…" : "Agendar mudança"}
                    </button>
                  )}
                  {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2 border border-line text-fg font-mono text-[10px] uppercase tracking-widest hover:bg-fg hover:text-bg transition-colors"><MessageCircle size={13} /> WhatsApp</a>}
                  {!resolvido(s) && <button onClick={() => marcar(s, "Resolvido")} className="inline-flex items-center gap-2 px-4 py-2 border border-line text-fg font-mono text-[10px] uppercase tracking-widest hover:bg-fg hover:text-bg transition-colors"><Check size={13} /> Resolvido</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
