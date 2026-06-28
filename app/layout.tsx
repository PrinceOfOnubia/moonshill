import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import { IntroProvider } from "@/components/providers/IntroProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Moonshill — Grow. Engage. Earn.",
  description:
    "Moonshill is the community-first crypto arena. Projects fund missions, contests and campaigns. Create on X, submit your link, compete for rewards.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="antialiased"
    >
      <body className="min-h-dvh">
        <ViewTransitions>
          <IntroProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </IntroProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
