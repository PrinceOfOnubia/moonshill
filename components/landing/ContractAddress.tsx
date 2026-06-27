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

  const short = `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-8)}`;

  return (
    <button
      onClick={copy}
      className={`group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10 ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-faint">
          Contract Address (CA)
        </span>
        <span className="mt-0.5 flex items-center gap-2 font-mono text-[15px] text-text">
          {short}
          {copied ? <Check size={14} className="text-green" /> : <Copy size={13} className="text-faint" />}
        </span>
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-faint transition-colors group-hover:text-text">
        {copied ? <Check size={16} className="text-green" /> : <Copy size={15} />}
      </span>
    </button>
  );
}
