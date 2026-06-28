"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { getMe, logout, walletChallenge, walletVerify } from "@/lib/api";
import type { MeResponse } from "@/lib/api";
import { BSC_CHAIN_ID, connectInjectedWallet, formatWalletError } from "@/lib/wallet";

const STORAGE_KEY = "mb_wallet";
const STORAGE_CHAIN_KEY = "mb_wallet_chain";
const STORAGE_POST_CONNECT_KEY = "mb_post_connect";

interface AuthState {
  /** Whether a wallet session is authenticated (user is in the app). */
  connected: boolean;
  /** Connected wallet address. */
  address: string | null;
  chainId: string | null;
  user: MeResponse | null;
  /** True until localStorage has been read, to avoid landing/app flash. */
  ready: boolean;
  connectModalOpen: boolean;
  openConnect: (nextPath?: string) => void;
  closeConnect: () => void;
  /** Simulate a successful wallet connection. */
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  connectError: string | null;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [, setPostConnectPath] = useState("/home");

  const refreshUser = useCallback(async () => {
    try {
      const next = await getMe();
      setUser(next);
      setAddress(next.wallet);
      try {
        localStorage.setItem(STORAGE_KEY, next.wallet);
      } catch {
        /* ignore */
      }
    } catch {
      setUser(null);
      setAddress(null);
      setChainId(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_CHAIN_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
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
          setUser((current) => current && current.wallet.toLowerCase() === next.toLowerCase() ? current : null);
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          return;
        }
        setAddress(null);
        setChainId(null);
        setUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
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
      cleanup = () => {
        ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
        ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    }

    void (async () => {
      try {
        if (ethereum) {
          const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
          const currentChain = (await ethereum.request({ method: "eth_chainId" })) as string;
          if (accounts?.[0]) setAddress(accounts[0]);
          if (currentChain) setChainId(currentChain);
        }
        await refreshUser();
      } finally {
        setReady(true);
      }
    })();

    return () => cleanup?.();
  }, [refreshUser]);

  const openConnectWithPath = useCallback((nextPath = "/home") => {
    setPostConnectPath(nextPath);
    try {
      localStorage.setItem(STORAGE_POST_CONNECT_KEY, nextPath);
    } catch {
      /* ignore */
    }
    setConnectModalOpen(true);
  }, []);
  const closeConnect = useCallback(() => {
    setConnectModalOpen(false);
    setConnectError(null);
  }, []);

  const connect = useCallback(async (walletId: string) => {
    setConnectError(null);
    try {
      const { address: nextAddress, provider } = await connectInjectedWallet(walletId as Parameters<typeof connectInjectedWallet>[0]);
      const challenge = await walletChallenge(nextAddress);
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.message, nextAddress],
      })) as string;
      const verified = await walletVerify(nextAddress, signature);
      setAddress(nextAddress);
      setChainId(BSC_CHAIN_ID);
      setUser(verified.user);
      localStorage.setItem(STORAGE_KEY, nextAddress);
      localStorage.setItem(STORAGE_CHAIN_KEY, BSC_CHAIN_ID);
      setConnectModalOpen(false);
    } catch (error) {
      setConnectError(formatWalletError(error));
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setUser(null);
    setConnectError(null);
    try {
      void logout();
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_CHAIN_KEY);
      localStorage.removeItem(STORAGE_POST_CONNECT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        connected: !!user && !!address && (!chainId || chainId === BSC_CHAIN_ID),
        address,
        chainId,
        user,
        ready,
        connectModalOpen,
        openConnect: openConnectWithPath,
        closeConnect,
        connect,
        disconnect,
        connectError,
        refreshUser,
      }}
    >
      {children}
      <ConnectModal />
    </AuthCtx.Provider>
  );
}
