import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export default function RotatingText({ items, interval = 3800 }: { items: string[]; interval?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items, interval]);

  const text = items && items.length ? items[i % items.length] : "";

  return (
    <span className="inline-block">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
