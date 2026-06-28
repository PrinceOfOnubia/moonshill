"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { RewardTicker } from "./RewardTicker";
import { Footer } from "./Footer";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from "@/components/providers/AuthProvider";

// Marketing routes that stay reachable while logged out (no app chrome).
const PUBLIC_ROUTES = ["/docs", "/privacy", "/terms", "/token"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { connected, ready } = useAuth();
  const pathname = usePathname();

  // Avoid a landing/app flash before localStorage is read.
  if (!ready) return null;

  if (!connected) {
    const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
    return (
      <>
        <SmoothScroll />
        <LandingHeader />
        <main className="relative z-10 mx-auto min-h-[60vh] w-full max-w-[1240px] px-4 pb-12 pt-2 sm:px-6">
          {isPublic ? <div className="pt-4">{children}</div> : <LandingPage />}
        </main>
        <LandingFooter />
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
