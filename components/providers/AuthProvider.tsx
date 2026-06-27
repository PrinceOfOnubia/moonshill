"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { BSC_CHAIN_ID, connectInjectedWallet, formatWalletError } from "@/lib/wallet";

const STORAGE_KEY = "mb_wallet";
const STORAGE_LABEL_KEY = "mb_wallet_label";
const STORAGE_CHAIN_KEY = "mb_wallet_chain";

interface AuthState {
  /** Whether a wallet is connected (user is in the authenticated app). */
  connected: boolean;
  /** Connected wallet address (mock). */
  address: string | null;
  walletLabel: string | null;
  chainId: string | null;
  /** True until localStorage has been read, to avoid landing/app flash. */
  ready: boolean;
  connectModalOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  /** Simulate a successful wallet connection. */
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  connectError: string | null;
}

const AuthCtx = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
      const savedLabel = localStorage.getItem(STORAGE_LABEL_KEY);
      if (savedLabel) setWalletLabel(savedLabel);
      const savedChain = localStorage.getItem(STORAGE_CHAIN_KEY);
      if (savedChain) setChainId(savedChain);
    } catch {
      /* ignore */
    }

    const ethereum = window.ethereum;
    if (ethereum?.on) {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0];
        const next = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
        if (next) {
          setAddress(next);
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          return;
        }
        setAddress(null);
        setWalletLabel(null);
        setChainId(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_LABEL_KEY);
          localStorage.removeItem(STORAGE_CHAIN_KEY);
        } catch {
          /* ignore */
        }
      };

      const handleChainChanged = (...args: unknown[]) => {
        const nextChainId = args[0];
        const value = typeof nextChainId === "string" ? nextChainId : null;
        setChainId(value);
        try {
          if (value) localStorage.setItem(STORAGE_CHAIN_KEY, value);
        } catch {
          /* ignore */
        }
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
      void (async () => {
        try {
          const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
          const currentChain = (await ethereum.request({ method: "eth_chainId" })) as string;
          if (accounts?.[0]) {
            setAddress(accounts[0]);
            setChainId(currentChain);
          }
        } catch {
          /* ignore */
        }
        setReady(true);
      })();

      cleanup = () => {
        ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
        ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    } else {
      setReady(true);
    }

    return () => {
      cleanup?.();
    };
  }, []);

  const openConnect = useCallback(() => setConnectModalOpen(true), []);
  const closeConnect = useCallback(() => {
    setConnectModalOpen(false);
    setConnectError(null);
  }, []);

  const connect = useCallback(async (walletId: string) => {
    setConnectError(null);
    try {
      const { address: nextAddress, walletLabel: nextLabel } = await connectInjectedWallet(
        walletId as Parameters<typeof connectInjectedWallet>[0],
      );
      setAddress(nextAddress);
      setWalletLabel(nextLabel);
      setChainId(BSC_CHAIN_ID);
      localStorage.setItem(STORAGE_KEY, nextAddress);
      localStorage.setItem(STORAGE_LABEL_KEY, nextLabel);
      localStorage.setItem(STORAGE_CHAIN_KEY, BSC_CHAIN_ID);
      setConnectModalOpen(false);
    } catch (error) {
      setConnectError(formatWalletError(error));
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletLabel(null);
    setChainId(null);
    setConnectError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_LABEL_KEY);
      localStorage.removeItem(STORAGE_CHAIN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const connected = !!address && chainId === BSC_CHAIN_ID;

  return (
    <AuthCtx.Provider
      value={{
        connected,
        address,
        walletLabel,
        chainId,
        ready,
        connectModalOpen,
        openConnect,
        closeConnect,
        connect,
        disconnect,
        connectError,
      }}
    >
      {children}
      <ConnectModal />
    </AuthCtx.Provider>
  );
}
