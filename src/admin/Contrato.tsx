import { useConfig } from "./ConfigContext";
import { input, card, pageTitle, pageSub } from "./ui";
import SaveBar from "./SaveBar";

export default function Contrato() {
  const { cfg, setCfg } = useConfig();
  return (
    <div>
      <h1 className={pageTitle}>Termo de compromisso</h1>
      <p className={pageSub}>Texto do contrato. Reveja juridicamente antes de usar com clientes.</p>
      <section className={card}>
        <textarea
          className={input + " min-h-[460px] resize-y text-[13px] leading-relaxed"}
          value={cfg.contract}
          onChange={(e) => setCfg({ ...cfg, contract: e.target.value })}
        />
      </section>
      <SaveBar />
    </div>
  );
}
