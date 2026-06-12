import { useState } from "react";
import { LocateFixed, Loader2, Check } from "lucide-react";

const field = "w-full bg-bg border border-line px-4 py-4 text-base text-fg outline-none focus:border-accent transition-colors";
const lbl = "block text-[11px] font-mono uppercase tracking-[0.15em] text-faint mb-2";

// Locais de Moçambique para sugestões (províncias + principais cidades/vilas)
const MZ = [
  "Maputo Cidade", "Maputo Província", "Matola", "Boane", "Marracuene", "Manhiça", "Namaacha",
  "Gaza", "Xai-Xai", "Chókwè", "Chibuto", "Macia", "Bilene",
  "Inhambane", "Maxixe", "Vilankulo", "Massinga", "Inharrime",
  "Sofala", "Beira", "Dondo", "Gorongosa", "Nhamatanda", "Marromeu",
  "Manica", "Chimoio", "Gondola", "Manica (cidade)", "Catandica",
  "Tete", "Moatize", "Cahora Bassa", "Ulóngwe", "Angónia",
  "Zambézia", "Quelimane", "Mocuba", "Gurúè", "Milange", "Alto Molócuè",
  "Nampula", "Nampula (cidade)", "Nacala", "Angoche", "Monapo", "Ilha de Moçambique",
  "Niassa", "Lichinga", "Cuamba", "Marrupa", "Mandimba",
  "Cabo Delgado", "Pemba", "Montepuez", "Mocímboa da Praia", "Chiúre", "Mueda",
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function LocationFields({
  cidade, bairro, onCidade, onBairro, onGps,
}: {
  cidade: string; bairro: string;
  onCidade: (v: string) => void; onBairro: (v: string) => void; onGps: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [geo, setGeo] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const matches = cidade.trim()
    ? MZ.filter((c) => norm(c).includes(norm(cidade))).slice(0, 8)
    : MZ.slice(0, 8);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeo("error"); return; }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        onGps(`${lat.toFixed(6)},${lon.toFixed(6)}`);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt`);
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.county || "";
          const province = a.state || a.region || "";
          const suburb = a.suburb || a.neighbourhood || a.quarter || a.hamlet || a.residential || "";
          onCidade([city, province].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(city && province ? ", " : ""));
          if (suburb) onBairro(suburb);
        } catch { /* sem reverse-geocode — fica só com as coordenadas */ }
        setGeo("ok");
      },
      () => setGeo("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-5">
      {/* Cidade com autocomplete */}
      <div className="relative">
        <label className={lbl}>Cidade / Província *</label>
        <input
          required
          className={field}
          value={cidade}
          autoComplete="off"
          onChange={(e) => { onCidade(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Comece a escrever…"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 border border-line bg-bg max-h-56 overflow-y-auto shadow-2xl">
            {matches.map((c) => (
              <li key={c}>
                <button type="button" onMouseDown={() => { onCidade(c); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted hover:bg-card hover:text-fg transition-colors">
                  {c}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bairro + botão localização */}
      <div>
        <label className={lbl}>Bairro / zona *</label>
        <input required className={field} value={bairro} onChange={(e) => onBairro(e.target.value)} placeholder="Ex: Bairro Central" />
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        className="inline-flex items-center gap-2 px-4 py-3 border border-line font-mono text-[11px] uppercase tracking-[0.15em] text-fg hover:bg-fg hover:text-bg transition-colors disabled:opacity-60"
        disabled={geo === "loading"}
      >
        {geo === "loading" ? <Loader2 size={15} className="animate-spin" /> : geo === "ok" ? <Check size={15} className="text-[#34C759]" /> : <LocateFixed size={15} />}
        {geo === "loading" ? "A obter localização…" : geo === "ok" ? "Localização capturada" : "Usar a minha localização"}
      </button>
      {geo === "error" && <p className="text-[12px] text-faint">Não foi possível obter a localização. Pode preencher manualmente ou enviar pelo WhatsApp.</p>}
      {geo === "ok" && <p className="text-[12px] text-faint">Localização capturada. Confirme a cidade e o bairro acima, se necessário.</p>}
    </div>
  );
}
