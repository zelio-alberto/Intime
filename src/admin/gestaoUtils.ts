// Utilitários partilhados das páginas de gestão na web (porto de data.dart).
import { Timestamp, addDoc, collection, doc, setDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db, auth } from "../firebase";

// Regista um movimento no livro central (não falha o fluxo se der erro).
export async function logMov(tipo: string, descricao: string, opts?: { kitId?: string; clienteId?: string; valor?: number }) {
  try {
    await addDoc(collection(db, "movimentos"), {
      tipo, descricao,
      kitId: opts?.kitId || "", clienteId: opts?.clienteId || "", valor: opts?.valor || 0,
      by: auth.currentUser?.email || "", at: serverTimestamp(),
    });
  } catch { /* */ }
}

// Regista no Masterfile a saída do plano Starlink de um kit (idempotente por kit+mês:
// re-marcar o mesmo mês reescreve o mesmo doc, nunca duplica a despesa).
export async function registarDespesaStarlink(kit: { id: string } & DocumentData, mes = monthKey()) {
  try {
    const valor = parseMoney(starlinkOf(kit)?.amount);
    await setDoc(doc(db, "despesas", `sl_${kit.id}_${mes}`), {
      tipo: "starlink",
      descricao: `Plano Starlink ${monthLabel(mes)} — ${kit.cliente || kit.conta || "kit"}`,
      fornecedor: "Starlink", valor,
      kitId: kit.id, kitNome: String(kit.cliente || kit.conta || ""),
      mes, data: Timestamp.now(),
      by: auth.currentUser?.email || "", createdAt: serverTimestamp(),
    }, { merge: true });
    await logMov("despesa", `Pago à Starlink ${fmtMoney(valor)} (${monthLabel(mes)})`, { kitId: kit.id, valor });
  } catch { /* */ }
}

export function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  let s = String(v).replace(/[^0-9.,]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return parseFloat(s) || 0;
}

export function fmtMoney(v: number, suffix = true): string {
  const neg = v < 0;
  const s = Math.round(Math.abs(v)).toString();
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ".";
    out += s[i];
  }
  return `${neg ? "-" : ""}${out}${suffix ? " MT" : ""}`;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const meses = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const p = key.split("-");
  if (p.length !== 2) return key;
  const m = parseInt(p[1], 10) || 0;
  return `${m >= 1 && m <= 12 ? meses[m] : p[1]} ${p[0]}`;
}

export function daysUntil(isoDate?: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

export function kitAlocado(kit: DocumentData): boolean {
  const estado = String(kit.estado ?? "").toLowerCase();
  return estado === "alugado" || String(kit.cliente ?? "").length > 0;
}

export function starlinkOf(kit: DocumentData): DocumentData | null {
  return kit.starlink && typeof kit.starlink === "object" ? (kit.starlink as DocumentData) : null;
}

export function margemMensal(kit: DocumentData): number {
  return parseMoney(kit.mensalidade) - parseMoney(starlinkOf(kit)?.amount);
}

export function fmtDateTime(ts: unknown): string {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return "";
}

export function estadoPillCls(estado: string): string {
  const e = estado.toLowerCase();
  if (e.includes("activ") || e.includes("ativ") || e.includes("alugad")) return "text-accent border-accent/40 bg-accent/10";
  if (e.includes("atraso") || e.includes("suspens") || e.includes("dívida") || e.includes("divida") || e.includes("falh")) return "text-[#ff6b6b] border-[#ff6b6b]/40 bg-[#ff6b6b]/10";
  return "text-muted border-line bg-card/40";
}
