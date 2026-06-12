import { useConfig } from "./ConfigContext";
import { input, card, pageTitle, pageSub } from "./ui";
import SaveBar from "./SaveBar";

export default function Frases() {
  const { cfg, setCfg } = useConfig();
  return (
    <div>
      <h1 className={pageTitle}>Frases do hero</h1>
      <p className={pageSub}>Frases que rodam no topo da página inicial. Uma por linha — aparecem em sequência, com animação.</p>
      <section className={card}>
        <textarea
          className={input + " min-h-[360px] resize-y text-[14px] leading-relaxed"}
          value={cfg.taglines.join("\n")}
          onChange={(e) => setCfg({ ...cfg, taglines: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
        />
        <p className="text-faint text-xs mt-3">{cfg.taglines.length} frase(s).</p>
      </section>
      <SaveBar />
    </div>
  );
}
