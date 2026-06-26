"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Placeholder contract address — swap for the real CA at launch. */
export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export function ContractAddress({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(CONTRACT_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button
      onClick={copy}
      className={`group flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-2 ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-bright">
        CA
      </span>
      <span className="truncate font-mono text-[12.5px] text-muted sm:text-[13.5px]">
        {CONTRACT_ADDRESS}
      </span>
      <span className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-faint transition-colors group-hover:text-text">
        {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
      </span>
    </button>
  );
}
