import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  doc, collection, setDoc, addDoc, updateDoc, getDoc, onSnapshot, serverTimestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { useSiteConfig } from "../useSiteConfig";
import { input, label, pageTitle } from "./ui";
import { parseMoney, fmtMoney, monthKey, kitAlocado, logMov } from "./gestaoUtils";
import { User, Building2, MapPin, Boxes, Satellite, Receipt, Check, CheckCircle2, Printer, Plus } from "lucide-react";

async function proximoNumeroConta(): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const cand = `IN-${1000 + Math.floor(Math.random() * 9000)}`;
    try { const s = await getDoc(doc(db, "portalContas", cand)); if (!s.exists()) return cand; } catch { return cand; }
  }
  return `IN-${1000 + Math.floor(Math.random() * 9000)}`;
}

async function uploadCloudinary(file: File, cloudName: string, preset: string, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file); form.append("upload_preset", preset); if (folder) form.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("cloudinary");
  const data = await res.json();
  const url = data.secure_url || data.url;
  if (!url) throw new Error("sem url");
  return String(url);
}

const CAMPOS = ["nome", "documento", "whatsapp", "email", "nomeEmpresa", "nuit", "tipoNegocio", "repCargo", "provincia", "cidade", "bairro", "referencia", "gps", "mensalidade", "taxa", "dataInicio", "diaPagamento", "valorInscricao"] as const;
type Campo = (typeof CAMPOS)[number];
const CONFS = ["Recebeu os equipamentos", "Os equipamentos pertencem à Intime", "Aceita pagar a mensalidade acordada", "Aceita devolver os equipamentos em caso de rescisão", "Aceita as regras de suspensão por falta de pagamento"];
const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function NovoCadastro() {
  const cfg = useSiteConfig();
  const [params] = useSearchParams();
  const leadId = params.get("lead");

  const [f, setF] = useState<Record<Campo, string>>(() => ({ ...Object.fromEntries(CAMPOS.map((k) => [k, ""])), dataInicio: hojeISO() } as Record<Campo, string>));
  const [tipo, setTipo] = useState<"particular" | "empresa">("particular");
  const [tipoLocal, setTipoLocal] = useState("Casa");
  const [metodo, setMetodo] = useState("M-Pesa");
  const [pacoteNome, setPacoteNome] = useState("");
  const [kitId, setKitId] = useState("");
  const [confs, setConfs] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<Record<string, File | undefined>>({});
  const [lead, setLead] = useState<DocumentData | null>(null);
  const [kits, setKits] = useState<DocumentData[]>([]);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [done, setDone] = useState<{ numeroConta: string; numeroContrato: string; nome: string } | null>(null);

  const set = (k: Campo, v: string) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    const u = onSnapshot(collection(db, "kits"), (s) => setKits(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => u();
  }, []);

  // prefill a partir de um lead (?lead=ID)
  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const s = await getDoc(doc(db, "inscricoes", leadId));
        if (!s.exists()) return;
        const d = { id: s.id, ...s.data() } as DocumentData;
        setLead(d);
        setF((o) => ({ ...o, nome: d.nome || o.nome, whatsapp: d.whatsapp || o.whatsapp, bairro: d.bairro || o.bairro, cidade: d.cidade || o.cidade, gps: d.gps || o.gps }));
        if (d.plano) setPacoteNome(String(d.plano));
      } catch { /* */ }
    })();
  }, [leadId]);

  const kitsLivres = useMemo(() => kits.filter((k) => !kitAlocado(k)), [kits]);

  const escolherPacote = (nome: string) => {
    setPacoteNome(nome);
    const p = (cfg.plans || []).find((x) => x.name === nome);
    if (p && p.price && p.price !== "Sob") set("mensalidade", String(parseMoney(p.price)));
  };

  const submit = async () => {
    if (!f.nome.trim()) { setErro("Indique o nome."); return; }
    setBusy(true); setErro("");
    try {
      const cliId = doc(collection(db, "clientes")).id;
      const numeroConta = await proximoNumeroConta();
      const numeroContrato = numeroConta.replace("IN-", "CT-") + "-01";
      const promotor = String(lead?.promotor || "").trim();
      const email = f.email.trim().toLowerCase();
      const waDigits = f.whatsapp.replace(/\D/g, "");
      const last4 = waDigits.slice(-4);

      // fotos → Cloudinary (se configurado)
      const cN = cfg.cloudinary?.cloudName, cP = cfg.cloudinary?.uploadPreset;
      const urls: Record<string, string> = {};
      if (cN && cP) {
        for (const k of Object.keys(fotos)) {
          const file = fotos[k];
          if (file) { try { urls[k] = await uploadCloudinary(file, cN, cP, `clientes/${cliId}`); } catch { /* */ } }
        }
      }

      await setDoc(doc(db, "clientes", cliId), {
        tipo, numeroConta, nome: f.nome.trim(), documento: f.documento.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(),
        nomeEmpresa: f.nomeEmpresa.trim(), nuit: f.nuit.trim(), tipoNegocio: f.tipoNegocio.trim(), repCargo: f.repCargo.trim(),
        provincia: f.provincia.trim(), cidade: f.cidade.trim(), bairro: f.bairro.trim(), referencia: f.referencia.trim(), tipoLocal, gps: f.gps.trim(),
        estado: "Activo", fotoDoc: urls.documento || null, fotoCasa: urls.casa || null, fotoEmpresa: urls.empresa || null,
        ...(promotor ? { promotor } : {}), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await logMov("cliente", `Cadastro ${tipo === "empresa" ? "empresa" : "cliente"}: ${f.nome.trim()}`, { clienteId: cliId });

      await setDoc(doc(db, "portalContas", numeroConta), {
        numeroConta, clienteId: cliId, nome: f.nome.trim(), email, whatsappLast4: last4,
        pacote: pacoteNome || "", mensalidade: f.mensalidade.trim(), diaPagamento: f.diaPagamento.trim(),
        estado: "Activo", ...(promotor ? { promotor } : {}), atualizadoEm: serverTimestamp(),
      });
      if (email) await setDoc(doc(db, "portalEmails", email), { numeroConta });

      if (kitId) {
        await updateDoc(doc(db, "kits", kitId), {
          clienteId: cliId, cliente: f.nome.trim(), ...(promotor ? { promotor } : {}),
          pacote: pacoteNome || "", mensalidade: f.mensalidade.trim(), estado: "Alugado", gps: f.gps.trim(), diaPagamento: f.diaPagamento.trim(), updatedAt: serverTimestamp(),
        });
        await logMov("alocacao", `Alocada a ${f.nome.trim()}${pacoteNome ? ` · ${pacoteNome}` : ""}`, { kitId, clienteId: cliId });
      }

      if (f.valorInscricao.trim()) {
        await addDoc(collection(db, "pagamentos"), {
          kitId: kitId || "", clienteId: cliId, clienteNome: f.nome.trim(), ...(promotor ? { promotor } : {}),
          mes: monthKey(), valor: parseMoney(f.valorInscricao), metodo, estado: "Aprovado", tipo: "Inscrição", comprovativo: urls.comprovativo || null, data: serverTimestamp(),
        });
        await logMov("pagamento", `Inscrição · ${fmtMoney(parseMoney(f.valorInscricao))} (${metodo})`, { kitId: kitId || "", clienteId: cliId, valor: parseMoney(f.valorInscricao) });
      }

      await addDoc(collection(db, "contratos"), {
        numero: numeroContrato, numeroConta, clienteId: cliId, kitId: kitId || "", tipo, pacote: pacoteNome || "",
        mensalidade: f.mensalidade.trim(), taxa: f.taxa.trim(), dataInicio: f.dataInicio.trim(), diaPagamento: f.diaPagamento.trim(), estado: "Activo", createdAt: serverTimestamp(),
      });
      await logMov("contrato", `Contrato ${numeroContrato} gerado para ${f.nome.trim()} (${numeroConta})`, { kitId: kitId || "", clienteId: cliId });

      if (lead?.id) { try { await updateDoc(doc(db, "inscricoes", lead.id), { status: "concluido", clienteId: cliId }); } catch { /* */ } }

      setDone({ numeroConta, numeroContrato, nome: f.nome.trim() });
    } catch { setErro("Erro ao guardar. Tente de novo."); }
    finally { setBusy(false); }
  };

  const imprimirContrato = () => {
    if (!done) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const linhas = (cfg.contract || "").split("\n").map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${done.numeroContrato}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:32px auto;color:#111;line-height:1.5;padding:0 20px}h1{font-size:20px}table{font-size:13px;margin:16px 0;border-collapse:collapse}td{padding:3px 12px 3px 0}p{font-size:12.5px;margin:6px 0}</style></head><body>
      <h1>Contrato ${done.numeroContrato} — Intime</h1>
      <table>
        <tr><td><b>Cliente</b></td><td>${done.nome}</td></tr>
        <tr><td><b>Conta</b></td><td>${done.numeroConta}</td></tr>
        <tr><td><b>Pacote</b></td><td>${pacoteNome || "—"}</td></tr>
        <tr><td><b>Mensalidade</b></td><td>${f.mensalidade || "—"} MT</td></tr>
        <tr><td><b>Dia de pagamento</b></td><td>${f.diaPagamento || "—"}</td></tr>
        <tr><td><b>Início</b></td><td>${f.dataInicio || "—"}</td></tr>
        <tr><td><b>Local</b></td><td>${[f.bairro, f.cidade].filter(Boolean).join(", ")}</td></tr>
      </table>
      ${linhas}
      <p style="margin-top:40px">_____________________________<br>Assinatura do cliente</p>
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-accent" />
        <h1 className="font-display text-3xl text-fg mb-2">Cliente cadastrado</h1>
        <p className="text-muted text-sm mb-6">{done.nome} — conta <span className="font-mono text-fg">{done.numeroConta}</span> · contrato <span className="font-mono text-fg">{done.numeroContrato}</span></p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={imprimirContrato} className="inline-flex items-center gap-2 px-6 py-3 bg-fg text-bg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors"><Printer size={15} /> Imprimir contrato</button>
          <button onClick={() => { setDone(null); setF({ ...Object.fromEntries(CAMPOS.map((k) => [k, ""])), dataInicio: hojeISO() } as Record<Campo, string>); setPacoteNome(""); setKitId(""); setFotos({}); setConfs({}); setLead(null); }} className="inline-flex items-center gap-2 px-6 py-3 border border-line text-fg font-mono text-[11px] uppercase tracking-[0.2em] font-bold hover:border-accent/50 transition-colors"><Plus size={15} /> Novo cadastro</button>
        </div>
      </div>
    );
  }

  const Field = ({ k, lbl, ph, type }: { k: Campo; lbl: string; ph?: string; type?: string }) => (
    <div><label className={label}>{lbl}</label><input className={input} type={type} value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></div>
  );
  const todasConfs = CONFS.every((c) => confs[c]);

  return (
    <div className="max-w-3xl">
      <h1 className={pageTitle}>Novo cadastro</h1>
      <p className="text-muted text-sm mb-8">{lead ? `A converter o pedido de ${lead.nome || ""} em cliente.` : "Criar um novo cliente, alocar Starlink e gerar o contrato."}</p>

      <div className="space-y-6">
        <Card icon={tipo === "empresa" ? Building2 : User} titulo="Dados">
          <div className="flex gap-2 mb-5">
            {(["particular", "empresa"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-colors ${tipo === t ? "bg-fg text-bg border-fg" : "border-line text-muted hover:text-fg"}`}>{t === "particular" ? "Particular" : "Empresa"}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field k="nome" lbl={tipo === "empresa" ? "Nome do representante" : "Nome completo"} />
            <Field k="documento" lbl="Documento (BI/Passaporte)" />
            <Field k="whatsapp" lbl="WhatsApp" ph="84xxxxxxx" />
            <Field k="email" lbl="Email" />
            {tipo === "empresa" && <><Field k="nomeEmpresa" lbl="Nome da empresa" /><Field k="nuit" lbl="NUIT" /><Field k="tipoNegocio" lbl="Ramo de negócio" /><Field k="repCargo" lbl="Cargo do representante" /></>}
          </div>
        </Card>

        <Card icon={MapPin} titulo="Localização">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field k="provincia" lbl="Província" />
            <Field k="cidade" lbl="Cidade" />
            <Field k="bairro" lbl="Bairro" />
            <Field k="referencia" lbl="Ponto de referência" />
            <Field k="gps" lbl="GPS (lat, lng)" ph="-25.96, 32.58" />
            <div><label className={label}>Tipo de local</label>
              <select className={input} value={tipoLocal} onChange={(e) => setTipoLocal(e.target.value)}>{["Casa", "Apartamento", "Loja", "Escritório", "Armazém", "Outro"].map((t) => <option key={t}>{t}</option>)}</select>
            </div>
          </div>
        </Card>

        <Card icon={Boxes} titulo="Pacote e valores">
          <div className="mb-4"><label className={label}>Pacote</label>
            <select className={input} value={pacoteNome} onChange={(e) => escolherPacote(e.target.value)}>
              <option value="">— escolher —</option>
              {(cfg.plans || []).map((p) => <option key={p.id} value={p.name}>{p.name}{p.price && p.price !== "Sob" ? ` · ${p.price} ${p.unit}` : ""}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field k="mensalidade" lbl="Mensalidade (MT)" />
            <Field k="taxa" lbl="Taxa de adesão (MT)" />
            <Field k="dataInicio" lbl="Data de início" type="date" />
            <Field k="diaPagamento" lbl="Dia de pagamento (1-31)" />
          </div>
        </Card>

        <Card icon={Satellite} titulo="Equipamento (Starlink)">
          <label className={label}>Kit a alocar (opcional)</label>
          <select className={input} value={kitId} onChange={(e) => setKitId(e.target.value)}>
            <option value="">— sem kit por agora —</option>
            {kitsLivres.map((k) => <option key={k.id} value={k.id}>{k.tipo || k.conta || k.id}{k.kitSerial ? ` · ${k.kitSerial}` : ""}</option>)}
          </select>
          <p className="text-faint text-xs mt-2">{kitsLivres.length} kit(s) livre(s).</p>
        </Card>

        <Card icon={Receipt} titulo="Pagamento de inscrição">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field k="valorInscricao" lbl="Valor pago (MT)" />
            <div><label className={label}>Método</label>
              <select className={input} value={metodo} onChange={(e) => setMetodo(e.target.value)}>{["M-Pesa", "e-Mola", "Numerário", "Banco", "Outro"].map((m) => <option key={m}>{m}</option>)}</select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {([["documento", "Foto do documento"], ["casa", "Foto da casa/local"], ["comprovativo", "Comprovativo de pagamento"]] as const).map(([k, l]) => (
              <label key={k} className="border border-dashed border-line p-3 text-center text-xs cursor-pointer hover:border-accent/50 transition-colors">
                <div className="text-muted">{fotos[k] ? "✓ " + (fotos[k] as File).name.slice(0, 16) : l}</div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotos((o) => ({ ...o, [k]: e.target.files?.[0] }))} />
              </label>
            ))}
          </div>
          {!(cfg.cloudinary?.cloudName && cfg.cloudinary?.uploadPreset) && <p className="text-faint text-xs mt-2">As fotos só são guardadas depois de configurar o Cloudinary em Configurações → Pagamentos.</p>}
        </Card>

        <Card icon={Check} titulo="Confirmações">
          <div className="space-y-2">
            {CONFS.map((c) => (
              <label key={c} className="flex items-center gap-3 text-sm text-fg cursor-pointer">
                <input type="checkbox" className="accent-[var(--accent)]" checked={!!confs[c]} onChange={(e) => setConfs((o) => ({ ...o, [c]: e.target.checked }))} /> {c}
              </label>
            ))}
          </div>
        </Card>

        {erro && <p className="text-[#ff6b6b] text-sm">{erro}</p>}
        <button onClick={submit} disabled={busy || !todasConfs || !f.nome.trim()} className="w-full py-4 bg-fg text-bg font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-accent transition-colors disabled:opacity-40">
          {busy ? "A guardar…" : "Concluir cadastro e gerar contrato"}
        </button>
        {!todasConfs && <p className="text-faint text-xs text-center">Confirme todos os pontos para concluir.</p>}
      </div>
    </div>
  );
}

function Card({ icon: Ic, titulo, children }: { icon: typeof User; titulo: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-card p-6">
      <div className="flex items-center gap-2 font-display text-lg text-fg mb-5"><Ic size={18} className="text-accent" /> {titulo}</div>
      {children}
    </div>
  );
}
