import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  idealFor: string;      // "Ideal para" (casas pequenas, lojas, ...)
  equipment: string;     // "Equipamento incluído" (Starlink V4 + 1 router, ...)
  price: string;
  unit: string;
  from?: boolean;        // mostra "A partir de" antes do valor
  features: string[];
  featured?: boolean;
  image?: string;        // imagem do equipamento (/produtos/...)
  speedDetail?: string;  // velocidades
  wifiInfo?: string;     // dispositivos / cobertura Wi-Fi
  wiredInfo?: string;    // ligações físicas (Ethernet)
  speed?: string;        // opcional / legado
};

export type PaymentMethod = {
  tipo: string;       // "M-Pesa" | "e-Mola" | "Banco" | ...
  nome?: string;      // titular / nome da conta de pagamento
  numero?: string;    // número (carteira) ou conta/IBAN para onde transferir
  ativo?: boolean;    // aparece (ou não) na lista do cliente
};

export type TaxaInstalacao = {
  valor: string;    // ex: "5.000" — vazio = não mostrar valor concreto
  unidade: string;  // ex: "MT"
  nota: string;     // texto explicativo (pagamento único, o que cobre, variações)
  mostrar: boolean; // liga/desliga a exibição do valor no site
};

export type SiteConfig = {
  contacts: { email: string; whatsapp: string; phone: string };
  hero: { priceLabel: string; price: string; unit: string };
  plans: Plan[];
  taxaInstalacao: TaxaInstalacao;
  contract: string;
  taglines: string[];
  metodosPagamento: PaymentMethod[];
  cloudinary: { cloudName: string; uploadPreset: string };
};

export const DEFAULT_TAGLINES = [
  "A sua casa ligada ao mundo.",
  "Conectamos o que importa.",
  "Mais perto do mundo, todos os dias.",
  "O mundo à distância de uma ligação.",
  "Internet para viver sem limites.",
  "Onde a sua vida acontece, a Intime conecta.",
  "Conecte-se ao que realmente importa.",
  "O futuro começa com uma boa conexão.",
  "Internet para quem quer ir mais longe.",
  "Leve a sua casa mais longe.",
  "Porque estar ligado faz toda a diferença.",
  "Mais velocidade para a vida moderna.",
  "A conexão que move a sua vida.",
  "A sua porta de entrada para o mundo.",
];

export const DEFAULT_CONTRACT = `TERMO DE COMPROMISSO E CONDIÇÕES DE SERVIÇO — INTIME
(Rascunho — sujeito a revisão jurídica. As condições vinculativas constam do contrato final assinado.)

1. Objeto. A Intime presta o serviço de instalação, ativação, gestão e suporte de uma solução de internet via satélite no local indicado pelo Cliente, mediante avaliação técnica prévia.

2. Mensalidade. O Cliente paga a mensalidade do pacote contratado até à data acordada entre as partes. Os valores e condições finais são apresentados após a avaliação técnica da localização.

3. Taxa de Adesão e Instalação. No ato de adesão, o Cliente paga uma Taxa de Adesão e Instalação, destinada a cobrir deslocação, montagem, configuração, ativação, testes técnicos e demais procedimentos iniciais. Esta taxa não corresponde à mensalidade e o seu valor é informado antes da instalação, podendo variar conforme a localização, a complexidade da instalação, o pacote e os equipamentos necessários.

4. Equipamentos cedidos. Os equipamentos disponibilizados permanecem propriedade da Intime, salvo acordo escrito em contrário. O Cliente compromete-se a conservá-los em bom estado, não podendo vender, emprestar, transferir, desmontar, modificar, alterar configurações, deslocar para outro local ou permitir intervenção de terceiros sem autorização prévia da Intime. Em caso de dano, perda, roubo, mau uso ou não devolução, o Cliente poderá ser responsabilizado pelo valor de reparação, substituição ou recuperação.

5. Pagamento, suspensão e rescisão. Em caso de atraso no pagamento:
   • a partir de 30 dias — a Intime pode suspender temporariamente o serviço e emitir aviso de regularização;
   • a partir de 60 dias — a Intime pode emitir aviso final para pagamento ou devolução voluntária dos equipamentos;
   • a partir de 90 dias sem regularização — a Intime pode rescindir o contrato, recolher os equipamentos e cobrar os valores em dívida e custos de recuperação.

6. Disponibilidade e velocidade. As velocidades indicadas são máximas disponíveis, não garantidas, podendo variar consoante a localização, as condições meteorológicas e os níveis de tráfego.

7. Uso do serviço. O serviço destina-se ao uso acordado no pacote contratado. O Cliente não pode revender, partilhar ou redistribuir o acesso a terceiros sem autorização escrita da Intime.

8. Suporte. A Intime presta suporte local conforme o plano contratado.

9. Dados pessoais. Os dados recolhidos destinam-se apenas à prestação do serviço e não são partilhados com terceiros sem consentimento, nos termos da legislação aplicável.

Este documento é um resumo das condições. As condições completas e vinculativas constam do contrato assinado entre as partes.`;

// Valores por omissão — o site mostra isto enquanto nada estiver guardado no Firestore.
export const DEFAULT_CONFIG: SiteConfig = {
  contacts: {
    email: "intime@intime.co.mz",
    whatsapp: "258840000000",
    phone: "+258 84 000 0000",
  },
  hero: { priceLabel: "Planos a partir de", price: "3.500", unit: "MT / mês" },
  plans: [
    {
      id: "mini-lite",
      name: "Intime Mini Lite",
      tagline: "Para o uso básico do dia a dia.",
      idealFor: "Casas pequenas e uso básico",
      equipment: "Solução compacta de internet",
      price: "3.500",
      unit: "MT / mês",
      from: true,
      image: "/produtos/mini.png",
      speedDetail: "Até 100–200 Mbps",
      wifiInfo: "Wi-Fi 6 · cobertura até ~112 m² · até 128 dispositivos",
      wiredInfo: "Ligação por cabo (Ethernet) via adaptador",
      features: ["Equipamento compacto instalado", "Wi-Fi para espaço pequeno", "Navegação, redes sociais, chamadas e estudo", "Instalação e suporte local"],
      featured: false,
    },
    {
      id: "mini-plus",
      name: "Intime Mini Plus",
      tagline: "Mais estabilidade para o dia a dia.",
      idealFor: "Casas pequenas/médias com melhor desempenho",
      equipment: "Internet compacta de maior débito",
      price: "4.800",
      unit: "MT / mês",
      from: true,
      image: "/produtos/mini.png",
      speedDetail: "Até 150–250 Mbps",
      wifiInfo: "Wi-Fi 6 · cobertura reforçada · até 128 dispositivos",
      wiredInfo: "Ligação por cabo (Ethernet) via adaptador",
      features: ["Equipamento compacto instalado", "Maior desempenho e estabilidade", "Wi-Fi para a casa", "Instalação e suporte local"],
      featured: true,
    },
    {
      id: "casa",
      name: "Intime Casa",
      tagline: "Internet estável para a família.",
      idealFor: "Famílias e casas médias",
      equipment: "Internet via satélite + Wi-Fi padrão",
      price: "5.000",
      unit: "MT / mês",
      from: true,
      image: "/produtos/standard.png",
      speedDetail: "Até 200–300 Mbps",
      wifiInfo: "Wi-Fi 6 (Gen 3) · maior alcance · pronto para mesh",
      wiredInfo: "2 portas Ethernet",
      features: ["Equipamento principal instalado", "Wi-Fi para a casa", "Bom para 4K, trabalho e chamadas", "Instalação e suporte local"],
      featured: false,
    },
    {
      id: "casa-max",
      name: "Intime Casa Max",
      tagline: "Cobertura ampla para casas grandes.",
      idealFor: "Casas grandes com melhor cobertura Wi-Fi",
      equipment: "Internet + routers adicionais",
      price: "7.500",
      unit: "MT / mês",
      from: true,
      image: "/produtos/standard.png",
      speedDetail: "Até 250–300 Mbps",
      wifiInfo: "Wi-Fi 6 (Gen 3) + routers mesh adicionais · cobertura ampla",
      wiredInfo: "2 portas Ethernet + expansão",
      features: ["Equipamento principal instalado", "1 a 2 routers adicionais (mesh)", "Cobertura em várias áreas da casa", "Instalação e suporte local"],
      featured: false,
    },
    {
      id: "negocio",
      name: "Intime Negócio",
      tagline: "Para lojas, escritórios e empresas.",
      idealFor: "Lojas, escritórios e empresas",
      equipment: "Solução para vários utilizadores",
      price: "Sob",
      unit: "avaliação",
      from: false,
      image: "/produtos/hp.png",
      speedDetail: "Alto débito · sob avaliação",
      wifiInfo: "Rede Wi-Fi empresarial · vários pontos de acesso",
      wiredInfo: "Várias ligações por cabo (Ethernet)",
      features: ["Rede para vários utilizadores", "Routers adicionais conforme avaliação", "Configuração da rede do negócio", "Suporte prioritário"],
      featured: false,
    },
  ],
  taxaInstalacao: {
    valor: "1.500",
    unidade: "MT",
    nota: "Pagamento único no ato da adesão — cobre deslocação, montagem, configuração, ativação e testes. Pode variar conforme a localização e a complexidade da instalação.",
    mostrar: true,
  },
  contract: DEFAULT_CONTRACT,
  taglines: DEFAULT_TAGLINES,
  metodosPagamento: [],
  cloudinary: { cloudName: "", uploadPreset: "" },
};

export const CONFIG_REF = () => doc(db, "siteConfig", "starlink");

export function useSiteConfig(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const unsub = onSnapshot(
      CONFIG_REF(),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SiteConfig>;
          setCfg({
            contacts: { ...DEFAULT_CONFIG.contacts, ...(data.contacts || {}) },
            hero: { ...DEFAULT_CONFIG.hero, ...(data.hero || {}) },
            plans: data.plans && data.plans.length ? data.plans : DEFAULT_CONFIG.plans,
            taxaInstalacao: { ...DEFAULT_CONFIG.taxaInstalacao, ...(data.taxaInstalacao || {}) },
            contract: data.contract || DEFAULT_CONFIG.contract,
            taglines: data.taglines && data.taglines.length ? data.taglines : DEFAULT_CONFIG.taglines,
            metodosPagamento: Array.isArray(data.metodosPagamento) ? data.metodosPagamento : DEFAULT_CONFIG.metodosPagamento,
            cloudinary: { ...DEFAULT_CONFIG.cloudinary, ...(data.cloudinary || {}) },
          });
        }
      },
      () => {
        /* sem acesso / offline → mantém DEFAULT_CONFIG */
      }
    );
    return () => unsub();
  }, []);

  return cfg;
}
