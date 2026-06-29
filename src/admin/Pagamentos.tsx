import { useConfig } from "./ConfigContext";
import { type PaymentMethod } from "../useSiteConfig";
import { input, label, pageTitle } from "./ui";
import SaveBar from "./SaveBar";
import { Plus, Trash2, Wallet } from "lucide-react";

const TIPOS = ["M-Pesa", "e-Mola", "Banco", "Outro"];

export default function Pagamentos() {
  const { cfg, setCfg } = useConfig();
  const metodos: PaymentMethod[] = cfg.metodosPagamento || [];

  const set = (i: number, patch: Partial<PaymentMethod>) =>
    setCfg((c) => ({ ...c, metodosPagamento: (c.metodosPagamento || []).map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));
  const add = () =>
    setCfg((c) => ({ ...c, metodosPagamento: [...(c.metodosPagamento || []), { tipo: "M-Pesa", nome: "Intime", numero: "", ativo: true }] }));
  const remove = (i: number) =>
    setCfg((c) => ({ ...c, metodosPagamento: (c.metodosPagamento || []).filter((_, idx) => idx !== i) }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className={pageTitle}>Métodos de pagamento</h1>
          <p className="text-muted text-sm">Contas para onde os clientes transferem. Aparecem automaticamente no portal do cliente.</p>
        </div>
        <button onClick={add} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors shrink-0"><Plus size={14} /> Método</button>
      </div>

      {metodos.length === 0 ? (
        <div className="border border-dashed border-line p-10 text-center text-muted text-sm mt-8">
          Ainda não há métodos. Sem nenhum definido, o portal usa <b className="text-fg">M-Pesa</b> com o WhatsApp dos Contactos por omissão.
          <div className="mt-4"><button onClick={add} className="inline-flex items-center gap-2 bg-fg text-bg px-5 py-2.5 text-xs font-mono uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors"><Plus size={14} /> Adicionar M-Pesa</button></div>
        </div>
      ) : (
        <div className="space-y-5 mt-8">
          {metodos.map((m, i) => (
            <div key={i} className={`border p-5 bg-card ${m.ativo === false ? "border-line opacity-60" : "border-line"}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 font-display text-lg text-fg"><Wallet size={18} className="text-accent" /> {m.tipo || `Método ${i + 1}`}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer"><input type="checkbox" checked={m.ativo !== false} onChange={(e) => set(i, { ativo: e.target.checked })} /> Ativo</label>
                  <button onClick={() => remove(i)} className="text-faint hover:text-accent" title="Remover"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Tipo</label>
                  <select className={input} value={TIPOS.includes(m.tipo) ? m.tipo : "Outro"} onChange={(e) => set(i, { tipo: e.target.value })}>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={label}>Nome / titular</label><input className={input} value={m.nome || ""} onChange={(e) => set(i, { nome: e.target.value })} placeholder="Ex.: Intime, Lda" /></div>
                <div><label className={label}>Número / conta (para onde transferir)</label><input className={input} value={m.numero || ""} onChange={(e) => set(i, { numero: e.target.value })} placeholder="84xxxxxxx ou IBAN" /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SaveBar />
    </div>
  );
}
