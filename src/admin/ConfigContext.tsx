import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { getDoc, setDoc } from "firebase/firestore";
import { CONFIG_REF, DEFAULT_CONFIG, type SiteConfig } from "../useSiteConfig";

type Ctx = {
  cfg: SiteConfig;
  setCfg: Dispatch<SetStateAction<SiteConfig>>;
  save: () => Promise<void>;
  saving: boolean;
  flash: string;
  setFlash: (s: string) => void;
};

const ConfigCtx = createContext<Ctx>(null!);
export const useConfig = () => useContext(ConfigCtx);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [flash, setFlashState] = useState("");
  const setFlash = (s: string) => { setFlashState(s); setTimeout(() => setFlashState(""), 3500); };

  useEffect(() => {
    getDoc(CONFIG_REF())
      .then((s) => { if (s.exists()) setCfg({ ...DEFAULT_CONFIG, ...(s.data() as SiteConfig) }); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await setDoc(CONFIG_REF(), cfg, { merge: true }); setFlash("Guardado com sucesso ✓"); }
    catch { setFlash("Erro ao guardar — verifique as regras do Firestore."); }
    setSaving(false);
  };

  return <ConfigCtx.Provider value={{ cfg, setCfg, save, saving, flash, setFlash }}>{children}</ConfigCtx.Provider>;
}
