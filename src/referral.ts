/**
 * Rastreio de promotores (afiliados).
 *
 * Quando um visitante chega por um link de promotor — /p/:codigo ou ?ref=CODIGO
 * em qualquer página — guardamos o código no localStorage. Mais tarde, quando ele
 * aderir (Aderir.tsx), o código é carimbado no doc de `inscricoes` para sabermos
 * de quem veio o lead. A atribuição dura 60 dias.
 */
const KEY = "intime_ref";
const MAX_AGE = 60 * 24 * 60 * 60 * 1000; // 60 dias

export function saveRef(code?: string | null) {
  const c = (code || "").trim().toUpperCase();
  if (!c) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: c, at: Date.now() }));
  } catch { /* localStorage indisponível */ }
}

export function getRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r?.code) return null;
    if (typeof r.at === "number" && Date.now() - r.at > MAX_AGE) {
      localStorage.removeItem(KEY);
      return null;
    }
    return String(r.code);
  } catch { return null; }
}

export function clearRef() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}
