import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.substring(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 0);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="font-body text-fg bg-bg flex flex-col relative min-h-screen">
      <div className="noise-bg"></div>
      <Header />
      <main className="flex-1 relative z-10 w-full overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </div>
  );
}
