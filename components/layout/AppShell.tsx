"use client";

import { useEffect, useRef } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { RewardTicker } from "./RewardTicker";
import { Footer } from "./Footer";
import { CustomCursor } from "./CustomCursor";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

export function AppShell({ children }: { children: React.ReactNode }) {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const move = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <SmoothScroll />
      <CustomCursor />
      {/* cursor spotlight */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-0 hidden h-[600px] w-[600px] rounded-full opacity-60 mix-blend-screen md:block"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.10), rgba(240,185,11,0) 60%)",
        }}
      />
      <RewardTicker />
      <TopBar />
      <main className="relative z-10 mx-auto min-h-[60vh] w-full max-w-[1240px] px-4 pb-32 pt-6 sm:px-6 md:pb-20">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
