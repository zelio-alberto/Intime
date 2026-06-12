import { useConfig } from "./ConfigContext";
import { Save, Loader2 } from "lucide-react";

export default function SaveBar() {
  const { save, saving } = useConfig();
  return (
    <div className="sticky bottom-4 mt-10 flex justify-end pointer-events-none">
      <button onClick={save} disabled={saving}
        className="pointer-events-auto flex items-center gap-2 bg-fg text-bg px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.15em] font-bold hover:bg-accent transition-colors shadow-2xl disabled:opacity-50">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar alterações
      </button>
    </div>
  );
}
