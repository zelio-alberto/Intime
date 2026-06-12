import { useConfig } from "./ConfigContext";
import { input, label, card, pageTitle, pageSub } from "./ui";
import SaveBar from "./SaveBar";

export default function Contactos() {
  const { cfg, setCfg } = useConfig();
  return (
    <div>
      <h1 className={pageTitle}>Contactos & Hero</h1>
      <p className={pageSub}>Contactos do site e o preço em destaque da página inicial.</p>

      <section className={card + " mb-6"}>
        <h2 className="font-display text-2xl mb-6">Contactos</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <div><label className={label}>Email</label><input className={input} value={cfg.contacts.email} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, email: e.target.value } })} /></div>
          <div><label className={label}>WhatsApp (só números)</label><input className={input} value={cfg.contacts.whatsapp} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, whatsapp: e.target.value } })} /></div>
          <div><label className={label}>Telefone (visível)</label><input className={input} value={cfg.contacts.phone} onChange={(e) => setCfg({ ...cfg, contacts: { ...cfg.contacts, phone: e.target.value } })} /></div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-display text-2xl mb-6">Preço em destaque (hero)</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <div><label className={label}>Texto</label><input className={input} value={cfg.hero.priceLabel} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, priceLabel: e.target.value } })} /></div>
          <div><label className={label}>Valor</label><input className={input} value={cfg.hero.price} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, price: e.target.value } })} /></div>
          <div><label className={label}>Unidade</label><input className={input} value={cfg.hero.unit} onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, unit: e.target.value } })} /></div>
        </div>
      </section>

      <SaveBar />
    </div>
  );
}
