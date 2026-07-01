"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { RewardTicker } from "./RewardTicker";
import { Footer } from "./Footer";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from "@/components/providers/AuthProvider";

// Marketing routes that stay reachable while logged out (no app chrome).
const PUBLIC_ROUTES = ["/docs", "/privacy", "/terms", "/token", "/build", "/explore", "/challenge", "/project", "/u", "/leaderboard"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { connected, ready, refreshUser } = useAuth();
  const pathname = usePathname();
  const [recoveringAuth, setRecoveringAuth] = useState(false);

  useEffect(() => {
    const isXConnected = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("x") === "connected";

    if (!isXConnected || connected) {
      setRecoveringAuth(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setRecoveringAuth(true);
      const delays = [0, 250, 750, 1500, 3000, 5000, 8000, 12000, 16000];

      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (cancelled) return;
        }
        const nextUser = await refreshUser();
        if (nextUser) {
          if (!cancelled) setRecoveringAuth(false);
          return;
        }
      }

      if (!cancelled) setRecoveringAuth(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [connected, refreshUser, pathname]);

  // Avoid a landing/app flash before localStorage is read.
  if (!ready || recoveringAuth) return null;

  if (!connected) {
    const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
    return (
      <>
        <SmoothScroll />
        <LandingHeader />
        <main className="relative z-10 mx-auto min-h-[60vh] w-full max-w-[1240px] px-4 pb-12 pt-2 sm:px-6">
          {isPublic ? <div className="pt-4">{children}</div> : <LandingPage />}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SmoothScroll />
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
