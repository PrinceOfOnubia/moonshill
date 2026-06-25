import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number: 1234 -> 1.2K, 1_200_000 -> 1.2M */
export function compact(n: number, digits = 1): string {
  if (n < 1000) return `${n}`;
  const units = ["", "K", "M", "B", "T"];
  const tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), units.length - 1);
  const scaled = n / Math.pow(1000, tier);
  return `${scaled.toFixed(scaled % 1 === 0 ? 0 : digits)}${units[tier]}`;
}

export function fmtUsd(n: number): string {
  return `$${compact(n)}`;
}

export function fmtToken(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Time remaining until an ISO date, mobile-friendly short form */
export function timeLeft(iso: string): { label: string; urgent: boolean; ended: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { label: "Ended", urgent: false, ended: true };
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const urgent = diff < 86_400_000;
  if (d > 0) return { label: `${d}d ${h}h`, urgent: false, ended: false };
  if (h > 0) return { label: `${h}h ${m}m`, urgent, ended: false };
  return { label: `${m}m`, urgent: true, ended: false };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
