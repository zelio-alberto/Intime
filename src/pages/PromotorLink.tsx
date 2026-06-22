import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { saveRef } from "../referral";

/**
 * Rota /p/:codigo — ponto de entrada dos links de promotor.
 * Guarda o código (se o promotor existir e estiver ativo) e reencaminha
 * o visitante para o site normal, que pode navegar à vontade.
 */
export default function PromotorLink() {
  const { codigo } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = (codigo || "").trim().toUpperCase();
      if (c) {
        try {
          const snap = await getDoc(doc(db, "promotores", c));
          if (snap.exists() && snap.data().ativo !== false) saveRef(c);
        } catch {
          // Sem regras de leitura ou offline — guarda na mesma; valida-se depois.
          saveRef(c);
        }
      }
      if (alive) navigate("/", { replace: true });
    })();
    return () => { alive = false; };
  }, [codigo, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">A entrar…</p>
    </div>
  );
}
