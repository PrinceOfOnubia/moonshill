"use client";

import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/utils";

type TL = { label: string; urgent: boolean; ended: boolean };

const PLACEHOLDER: TL = { label: "—", urgent: false, ended: false };

/**
 * Live countdown that is SSR-safe: both the server and the first client render
 * emit the same stable placeholder ("—"), then the real value is computed and
 * refreshed every 30s on the client only. Avoids Date.now() hydration drift.
 */
export function useTimeLeft(iso: string): TL {
  const [value, setValue] = useState<TL>(PLACEHOLDER);

  useEffect(() => {
    const update = () => setValue(timeLeft(iso));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return value;
}
