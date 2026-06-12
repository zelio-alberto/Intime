import { useConfig } from "./ConfigContext";
import { type Plan } from "../useSiteConfig";
import { input, label, pageTitle } from "./ui";
import SaveBar from "./SaveBar";
import { Plus, Trash2 } from "lucide-react";

export default function Pacotes() {
  const { cfg, setCfg } = useConfig();

  const setPlan = (i: number, patch: Partial<Plan>) =>
    setCfg((c) => ({ ...c, plans: c.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const addPlan = () =>
    setCfg((c) => ({ ...c, plans: [...c.plans, { id: "plano-" + (c.plans.length + 1), name: "Novo pacote", tagline: "", idealFor: "", equipment: "", price: "0", unit: "MT / mês", from: true, features: [], featured: false }] }));
  const removePlan = (i: number) =>
    setCfg((c) => ({ ...c, plans: c.plans.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className={pageTitle}>Pacotes</h1>
          <p className="text-muted text-sm">Planos mostrados no slider do site e na adesão.</p>
        </div>
        <button onClick={addPlan} className="flex items-center gap-2 border border-line px-4 py-2.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-fg hover:text-bg transition-colors shrink-0"><Plus size={14} /> Pacote</button>
      </div>

      <div className="space-y-6">
        {cfg.plans.map((p, i) => (
          <div key={i} className="border border-line p-5 bg-card">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-lg text-fg">{p.name || `Pacote ${i + 1}`}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer"><input type="checkbox" checked={!!p.from} onChange={(e) => setPlan(i, { from: e.target.checked })} /> A partir de</label>
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer"><input type="checkbox" checked={!!p.featured} onChange={(e) => setPlan(i, { featured: e.target.checked })} /> Destaque</label>
                <button onClick={() => removePlan(i)} className="text-faint hover:text-accent" title="Remover"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div><label className={label}>Nome</label><input className={input} value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} /></div>
              <div><label className={label}>Ideal para</label><input className={input} value={p.idealFor} onChange={(e) => setPlan(i, { idealFor: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={label}>Equipamento incluído</label><input className={input} value={p.equipment} onChange={(e) => setPlan(i, { equipment: e.target.value })} /></div>
              <div><label className={label}>Mensalidade (valor)</label><input className={input} value={p.price} onChange={(e) => setPlan(i, { price: e.target.value })} /></div>
              <div><label className={label}>Unidade</label><input className={input} value={p.unit} onChange={(e) => setPlan(i, { unit: e.target.value })} /></div>
            </div>
            <div className="mb-4"><label className={label}>Descrição curta</label><input className={input} value={p.tagline} onChange={(e) => setPlan(i, { tagline: e.target.value })} /></div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div><label className={label}>Imagem (ex: /produtos/mini.png)</label><input className={input} value={p.image || ""} onChange={(e) => setPlan(i, { image: e.target.value })} /></div>
              <div><label className={label}>Velocidade</label><input className={input} value={p.speedDetail || ""} onChange={(e) => setPlan(i, { speedDetail: e.target.value })} /></div>
              <div><label className={label}>Wi-Fi (dispositivos / cobertura)</label><input className={input} value={p.wifiInfo || ""} onChange={(e) => setPlan(i, { wifiInfo: e.target.value })} /></div>
              <div><label className={label}>Por cabo (Ethernet)</label><input className={input} value={p.wiredInfo || ""} onChange={(e) => setPlan(i, { wiredInfo: e.target.value })} /></div>
            </div>
            <div><label className={label}>Características (uma por linha)</label>
              <textarea className={input + " min-h-[110px] resize-y font-mono text-[13px]"} value={p.features.join("\n")} onChange={(e) => setPlan(i, { features: e.target.value.split("\n").filter(Boolean) })} />
            </div>
          </div>
        ))}
      </div>

      <SaveBar />
    </div>
  );
}
