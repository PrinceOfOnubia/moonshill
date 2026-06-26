"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { me } from "@/lib/mock";

const STORAGE_KEY = "mb_wallet";

interface AuthState {
  /** Whether a wallet is connected (user is in the authenticated app). */
  connected: boolean;
  /** Connected wallet address (mock). */
  address: string | null;
  /** True until localStorage has been read, to avoid landing/app flash. */
  ready: boolean;
  connectModalOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  /** Simulate a successful wallet connection. */
  connect: (walletId: string) => void;
  disconnect: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const openConnect = useCallback(() => setConnectModalOpen(true), []);
  const closeConnect = useCallback(() => setConnectModalOpen(false), []);

  const connect = useCallback((_walletId: string) => {
    // Mock connection — in a real app this resolves the wallet's address.
    const addr = me.wallet;
    setAddress(addr);
    try {
      localStorage.setItem(STORAGE_KEY, addr);
    } catch {
      /* ignore */
    }
    setConnectModalOpen(false);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        connected: !!address,
        address,
        ready,
        connectModalOpen,
        openConnect,
        closeConnect,
        connect,
        disconnect,
      }}
    >
      {children}
      <ConnectModal />
    </AuthCtx.Provider>
  );
}
