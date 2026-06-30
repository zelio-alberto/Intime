import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { pageTitle } from "./ui";
import { MapPin, ExternalLink } from "lucide-react";

type Cli = { id: string } & DocumentData;

function parseGps(s: unknown): { lat: number; lng: number } | null {
  const m = String(s || "").match(/(-?\d{1,2}\.\d{3,})[,;\s]+(-?\d{1,3}\.\d{3,})/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Carrega o Leaflet do CDN uma só vez (sem dependência npm).
function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve((window as any).L)); return; }
    const s = document.createElement("script");
    s.id = "leaflet-js"; s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function Mapa() {
  const [clientes, setClientes] = useState<Cli[]>([]);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    const u = onSnapshot(collection(db, "clientes"), (s) => setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => u();
  }, []);

  const comGps = clientes.map((c) => ({ c, pos: parseGps(c.gps) })).filter((x): x is { c: Cli; pos: { lat: number; lng: number } } => !!x.pos);

  useEffect(() => {
    let cancel = false;
    loadLeaflet().then((L) => {
      if (cancel || !mapEl.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current).setView([-25.96, 32.58], 6); // Moçambique
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      layerRef.current.clearLayers();
      const pts: any[] = [];
      for (const { c, pos } of comGps) {
        const m = L.marker([pos.lat, pos.lng]).bindPopup(`<b>${c.nome || "—"}</b><br>${c.numeroConta || ""}<br>${[c.bairro, c.cidade].filter(Boolean).join(", ")}`);
        layerRef.current.addLayer(m);
        pts.push([pos.lat, pos.lng]);
      }
      if (pts.length) mapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }).catch(() => {});
    return () => { cancel = true; };
  }, [comGps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const focar = (lat: number, lng: number) => { mapRef.current?.setView([lat, lng], 15); };

  return (
    <div>
      <h1 className={pageTitle}>Mapa</h1>
      <p className="text-muted text-sm mb-6">Clientes com localização (GPS) registada — {comGps.length} de {clientes.length}.</p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div ref={mapEl} className="border border-line bg-card" style={{ height: "70vh", minHeight: 420 }} />

        <div className="border border-line bg-card overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div className="px-4 py-3 border-b border-line font-display text-lg text-fg">Localizações ({comGps.length})</div>
          {comGps.length === 0 ? (
            <p className="text-faint text-sm px-4 py-10 text-center">Nenhum cliente com GPS registado.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {comGps.map(({ c, pos }) => (
                <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                  <button onClick={() => focar(pos.lat, pos.lng)} className="w-8 h-8 grid place-items-center border border-line text-accent shrink-0 hover:bg-accent hover:text-bg transition-colors" title="Centrar no mapa"><MapPin size={14} /></button>
                  <div className="min-w-0 flex-1">
                    <div className="text-fg text-sm font-medium truncate">{c.nome || "—"}</div>
                    <div className="text-faint text-xs truncate">{[c.bairro, c.cidade].filter(Boolean).join(", ") || c.numeroConta}</div>
                  </div>
                  <a href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`} target="_blank" rel="noopener" className="text-faint hover:text-fg shrink-0 mt-0.5" title="Abrir no Google Maps"><ExternalLink size={14} /></a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
