import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

/**
 * Regista uma visualização de página (page_view) sempre que a rota muda.
 * Necessário porque numa SPA o GA4 só dispara o page_view no carregamento
 * inicial — as navegações via React Router não recarregam a página.
 */
export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (!analytics) return;
    logEvent(analytics, "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}
