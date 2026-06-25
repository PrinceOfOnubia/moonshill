"use client";

import { createContext, useContext, useState } from "react";

const IntroCtx = createContext<{ done: boolean; finish: () => void }>({
  done: false,
  finish: () => {},
});

export const useIntro = () => useContext(IntroCtx);

export function IntroProvider({ children }: { children: React.ReactNode }) {
  // Content is shown immediately (no preloader). Kept as a provider so the Hero
  // entrance still works if an intro sequence is reintroduced later.
  const [done, setDone] = useState(true);
  return (
    <IntroCtx.Provider value={{ done, finish: () => setDone(true) }}>
      {children}
    </IntroCtx.Provider>
  );
}
