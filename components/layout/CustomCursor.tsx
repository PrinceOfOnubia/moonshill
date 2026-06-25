"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Move } from "lucide-react";

type Variant = "default" | "link" | "join" | "drag";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<Variant>("default");
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-cursor],a,button,input,textarea,[role='button']",
      );
      if (!el) return setVariant("default");
      const c = el.getAttribute("data-cursor");
      if (c === "join") setVariant("join");
      else if (c === "drag") setVariant("drag");
      else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") setVariant("default");
      else setVariant("link");
    };
    const dn = () => setDown(true);
    const up = () => setDown(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", dn);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", dn);
      window.removeEventListener("mouseup", up);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [x, y]);

  if (!enabled) return null;

  const isLabel = variant === "join" || variant === "drag";
  const size = variant === "join" ? 64 : variant === "drag" ? 56 : variant === "link" ? 44 : 26;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9998] flex items-center justify-center rounded-full"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
    >
      <motion.div
        className="flex items-center justify-center rounded-full"
        animate={{
          width: size,
          height: size,
          scale: down ? 0.82 : 1,
          backgroundColor: isLabel ? "rgba(240,185,11,0.95)" : "rgba(240,185,11,0)",
          borderColor: isLabel ? "rgba(240,185,11,0)" : variant === "link" ? "rgba(252,213,53,0.9)" : "rgba(246,245,247,0.55)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        style={{ borderWidth: 1.5, mixBlendMode: isLabel ? "normal" : "difference" }}
      >
        <AnimatePresence mode="wait">
          {variant === "join" && (
            <motion.span key="join" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="font-display text-[11px] font-bold uppercase tracking-wider text-black">
              Join
            </motion.span>
          )}
          {variant === "drag" && (
            <motion.span key="drag" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-black">
              <Move size={20} strokeWidth={2.4} />
            </motion.span>
          )}
          {variant === "link" && (
            <motion.span key="link" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-gold-bright">
              <ArrowUpRight size={18} strokeWidth={2.4} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
