// Documentos imprimíveis da ficha comercial do cliente (admin): fatura de um
// pagamento, fatura provisória do próximo ciclo, extrato de conta e contrato.
// Mesmo esqueleto do portal (Conta.tsx): window.open + HTML branded + print()
// — o utilizador guarda como PDF pelo diálogo do browser.
import { Timestamp, type DocumentData } from "firebase/firestore";
import { parseMoney, monthKey } from "./gestaoUtils";

export type Contactos = { email: string; whatsapp: string; phone: string };

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtD = (d: Date) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
const fVal = (n: number) => n.toLocaleString("pt-PT");

const CSS = `*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0 auto;padding:36px;max-width:800px;font-size:13px;line-height:1.55}
  .head{display:flex;justify-content:space-between;align-items:flex-start;background:#f4f5f6;padding:26px;border-radius:10px}
  .brand{display:flex;align-items:center;gap:10px} .brand img{width:36px;height:36px;object-fit:contain} .brand b{font-size:21px;letter-spacing:3px}
  .rt{text-align:right} .rt h1{margin:0;font-size:24px} .rt .tag{display:inline-block;background:#e9edf0;color:#555;font-size:10px;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-top:6px}
  .rt .no{font-weight:bold;margin-top:8px} .rt .meta{color:#555;font-size:12px;margin-top:6px}
  .to{padding:20px 4px;color:#333} table{width:100%;border-collapse:collapse} th{text-align:left;border-bottom:1px solid #ccc;padding:10px 4px;font-size:12px} td{padding:9px 4px} .r{text-align:right}
  .tot td{border-top:1px solid #ccc;font-weight:bold} .due{font-size:20px;font-weight:bold;border-top:2px solid #111;padding-top:14px;display:flex;justify-content:space-between;margin-top:10px}
  .note{color:#555;font-size:12px;margin-top:24px} .foot{text-align:center;color:#666;font-size:11.5px;margin-top:44px;border-top:1px solid #eee;padding-top:16px}
  @media print{body{padding:14px}}`;

function abrirJanela(titulo: string, corpo: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head><body>${corpo}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { /* */ } }, 400);
}

const cabecalho = (titulo: string, extra: string) => {
  const logo = `${window.location.origin}/logo-intime.png`;
  return `<div class="head"><div class="brand"><img src="${logo}" alt="Intime"/><b>INTIME</b></div><div class="rt"><h1>${titulo}</h1>${extra}</div></div>`;
};
const rodape = (contacts: Contactos) =>
  `<div class="foot">Intime — Internet Starlink em Moçambique${contacts.email ? ` · ${esc(contacts.email)}` : ""}${contacts.phone ? ` · ${esc(contacts.phone)}` : ""}<br>Documento processado por computador.</div>`;

// Fatura de um pagamento aprovado — igual à do portal do cliente.
export function abrirFatura(p: DocumentData, dados: DocumentData, contacts: Contactos) {
  const valor = Math.round(parseMoney(p.valor));
  const dataPag = p.data instanceof Timestamp ? p.data.toDate() : new Date();
  const fim = new Date(dataPag); fim.setDate(fim.getDate() + 30);
  const conta = String(dados.numeroConta || "");
  const invNo = `INV-${conta}-${p.mes || monthKey()}`.toUpperCase();
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  const tel = String(dados.contactoWhatsapp || dados.whatsapp || "");
  abrirJanela(invNo, `
    ${cabecalho("Fatura", `<div class="no">${esc(invNo)}</div><div class="meta">Data: ${fmtD(dataPag)}<br>Conta: ${esc(conta)}</div>`)}
    <div class="to"><b>${esc(dados.nome)}</b>${local ? `<br>${esc(local)}` : ""}${tel ? `<br>${esc(tel)}` : ""}</div>
    <table>
      <tr><th>Descrição</th><th class="r">Qt</th><th class="r">Valor</th></tr>
      <tr><td>${esc(dados.pacote || "Serviço de internet Intime")}<br><span style="color:#777;font-size:11.5px">Período: ${fmtD(dataPag)} – ${fmtD(fim)}</span></td><td class="r">1</td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr class="tot"><td>Custo total</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr><td>Pagamento (${esc(p.metodo || "")}${p.codigo ? " · " + esc(p.codigo) : ""})</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
    </table>
    <div class="due"><span>Total devido</span><span>MZN 0</span></div>
    <p class="note">Mensalidade referente a 30 dias de serviço de internet Intime. Em caso de dúvida sobre esta fatura, contacte a equipa Intime${contacts.phone ? ` (${esc(contacts.phone)})` : ""}.</p>
    ${rodape(contacts)}`);
}

// Fatura PROVISÓRIA do próximo ciclo (ainda por pagar) — igual à do portal.
export function abrirProximaFatura(dados: DocumentData, prox: Date, contacts: Contactos) {
  const valor = Math.round(parseMoney(dados.mensalidadePendente || dados.mensalidade));
  const fim = new Date(prox); fim.setDate(fim.getDate() + 30);
  const conta = String(dados.numeroConta || "");
  const invNo = `INV-${conta}-${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-PREV`.toUpperCase();
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  abrirJanela(invNo, `
    ${cabecalho("Próxima fatura", `<div class="tag">PROVISÓRIA</div><div class="no">${esc(invNo)}</div><div class="meta">Vencimento: ${fmtD(prox)}<br>Conta: ${esc(conta)}</div>`)}
    <div class="to"><b>${esc(dados.nome)}</b>${local ? `<br>${esc(local)}` : ""}</div>
    <table>
      <tr><th>Descrição</th><th class="r">Qt</th><th class="r">Valor</th></tr>
      <tr><td>${esc(dados.pacotePendente || dados.pacote || "Serviço de internet Intime")}<br><span style="color:#777;font-size:11.5px">Período: ${fmtD(prox)} – ${fmtD(fim)}</span></td><td class="r">1</td><td class="r">MZN ${fVal(valor)}</td></tr>
      <tr class="tot"><td>Custo total</td><td></td><td class="r">MZN ${fVal(valor)}</td></tr>
    </table>
    <div class="due"><span>Total a pagar</span><span>MZN ${fVal(valor)}</span></div>
    <p class="note">Fatura provisória do próximo período de 30 dias. O valor pode mudar caso o pacote seja alterado. Pagamento até ${fmtD(prox)} para manter o serviço ativo.${contacts.phone ? ` Dúvidas: ${esc(contacts.phone)}.` : ""}</p>
    ${rodape(contacts)}`);
}

// Extrato de conta — histórico de pagamentos + posição atual (dívida / próximo vencimento).
export function abrirExtrato(dados: DocumentData, pags: DocumentData[], prox: Date | null, divida: number, contacts: Contactos) {
  const conta = String(dados.numeroConta || "");
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  const hoje = new Date();
  const aprovado = (p: DocumentData) => { const e = String(p.estado || "").toLowerCase(); return e.includes("aprov") || e.includes("pago"); };
  const totalPago = pags.filter(aprovado).reduce((s, p) => s + parseMoney(p.valor), 0);
  const linhas = pags.map((p) => {
    const d = p.data instanceof Timestamp ? p.data.toDate() : null;
    return `<tr><td>${d ? d.toLocaleDateString("pt-PT") : "—"}</td><td>${esc(p.mes || "—")}</td><td>${esc(p.tipo || "Mensalidade")}</td><td>${esc(p.metodo || "—")}</td><td>${esc(p.estado || "—")}</td><td class="r">MZN ${fVal(Math.round(parseMoney(p.valor)))}</td></tr>`;
  }).join("");
  abrirJanela(`Extrato ${conta}`, `
    ${cabecalho("Extrato de conta", `<div class="no">${esc(conta)}</div><div class="meta">Emitido: ${fmtD(hoje)}</div>`)}
    <div class="to"><b>${esc(dados.nome)}</b>${local ? `<br>${esc(local)}` : ""}</div>
    <table style="margin-bottom:18px">
      <tr><th>Pacote</th><th>Mensalidade</th><th>Estado</th><th>Próximo vencimento</th><th class="r">Em dívida</th></tr>
      <tr><td>${esc(dados.pacote || "—")}</td><td>MZN ${fVal(Math.round(parseMoney(dados.mensalidade)))}</td><td>${esc(dados.estado || "—")}</td><td>${prox ? fmtD(prox) : "—"}</td><td class="r"${divida > 0 ? ' style="color:#c00;font-weight:bold"' : ""}>MZN ${fVal(Math.round(divida))}</td></tr>
    </table>
    <table>
      <tr><th>Data</th><th>Mês</th><th>Tipo</th><th>Método</th><th>Estado</th><th class="r">Valor</th></tr>
      ${linhas || `<tr><td colspan="6" style="color:#777">Sem pagamentos registados.</td></tr>`}
      <tr class="tot"><td colspan="5">Total pago (aprovados)</td><td class="r">MZN ${fVal(Math.round(totalPago))}</td></tr>
    </table>
    <p class="note">Extrato informativo da conta Intime. Em caso de divergência, contacte a equipa Intime${contacts.phone ? ` (${esc(contacts.phone)})` : ""}.</p>
    ${rodape(contacts)}`);
}

// Contrato do cliente — dados do contrato + texto-template (config do site) + assinaturas.
export function imprimirContrato(ct: DocumentData | null, dados: DocumentData, contractText: string, contacts: Contactos) {
  const w = window.open("", "_blank");
  if (!w) return;
  const conta = String(dados.numeroConta || "");
  const numero = String(ct?.numero || `CT-${conta.replace(/\D/g, "")}-01`);
  const linhas = (contractText || "").split("\n").map((l) => `<p>${esc(l)}</p>`).join("");
  const rows: [string, string][] = [
    ["Cliente", String(dados.nome || "—")],
    ["Conta", conta || "—"],
    ["Documento", String(dados.documento || "—")],
    ["WhatsApp", String(dados.contactoWhatsapp || dados.whatsapp || "—")],
    ["Pacote", String(ct?.pacote || dados.pacote || "—")],
    ["Mensalidade", `${String(ct?.mensalidade || dados.mensalidade || "—")} MT`],
    ["Taxa de adesão", ct?.taxa ? `${ct.taxa} MT` : "—"],
    ["Dia de pagamento", String(ct?.diaPagamento || dados.diaPagamento || "—")],
    ["Início", String(ct?.dataInicio || "—")],
    ["Local", [dados.bairro, dados.cidade].filter(Boolean).join(", ") || "—"],
  ];
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${esc(numero)}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:32px auto;color:#111;line-height:1.5;padding:0 20px}h1{font-size:20px}table{font-size:13px;margin:16px 0;border-collapse:collapse}td{padding:3px 12px 3px 0}p{font-size:12.5px;margin:6px 0}.sig{display:flex;gap:60px;margin-top:48px}.foot{text-align:center;color:#666;font-size:11.5px;margin-top:40px;border-top:1px solid #eee;padding-top:14px}</style></head><body>
    <h1>Contrato ${esc(numero)} — Intime</h1>
    <table>${rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("")}</table>
    ${linhas}
    <div class="sig"><p>_____________________________<br>Assinatura do cliente</p><p>_____________________________<br>Pela Intime</p></div>
    <div class="foot">Intime — Internet Starlink em Moçambique${contacts.email ? ` · ${esc(contacts.email)}` : ""}${contacts.phone ? ` · ${esc(contacts.phone)}` : ""}</div>
    </body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { /* */ } }, 300);
}
