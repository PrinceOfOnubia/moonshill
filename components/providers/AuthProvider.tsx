"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { getMe, logout, verifyProjectWallet, walletChallenge, walletVerify } from "@/lib/api";
import type { MeResponse } from "@/lib/api";
import {
  BSC_CHAIN_ID,
  connectInjectedWallet,
  formatWalletError,
  getDefaultInjectedProvider,
} from "@/lib/wallet";
import type { InjectedProvider } from "@/lib/wallet";

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
  const [activeProvider, setActiveProvider] = useState<InjectedProvider | null>(null);
  const providerRef = useRef<InjectedProvider | null>(null);

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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
      const savedChain = localStorage.getItem(STORAGE_CHAIN_KEY);
      if (savedChain) setChainId(savedChain);
    } catch {
      /* ignore */
    }

    providerRef.current = getDefaultInjectedProvider();
    setActiveProvider(providerRef.current);

    void (async () => {
      try {
        const provider = providerRef.current;
        if (provider) {
          const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
          const currentChain = (await provider.request({ method: "eth_chainId" })) as string;
          if (accounts?.[0]) setAddress(accounts[0]);
          if (currentChain) setChainId(currentChain);
        }
        await refreshUser();
      } finally {
        setReady(true);
      }
    })();
  }, [refreshUser]);

  useEffect(() => {
    const provider = activeProvider || providerRef.current || getDefaultInjectedProvider();
    if (!provider?.on) return;

    const subscribedProvider = provider;
    providerRef.current = subscribedProvider;

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

    subscribedProvider.on?.("accountsChanged", handleAccountsChanged);
    subscribedProvider.on?.("chainChanged", handleChainChanged);
    return () => {
      subscribedProvider.removeListener?.("accountsChanged", handleAccountsChanged);
      subscribedProvider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [activeProvider]);

  const openConnectWithPath = useCallback((nextPath = "/home") => {
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
      const nextPath = typeof window !== "undefined"
        ? (localStorage.getItem(STORAGE_POST_CONNECT_KEY) || "/home")
        : "/home";
      try {
        await logout();
      } catch {
        /* ignore */
      }
      setUser(null);
      setAddress(null);
      setChainId(null);
      providerRef.current = null;
      setActiveProvider(null);
      const { address: nextAddress, provider } = await connectInjectedWallet(walletId as Parameters<typeof connectInjectedWallet>[0]);
      providerRef.current = provider;
      setActiveProvider(provider);
      const challenge = await walletChallenge(nextAddress);
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.message, nextAddress],
      })) as string;
      let verified: Awaited<ReturnType<typeof walletVerify>> | Awaited<ReturnType<typeof verifyProjectWallet>>;
      if (nextPath.startsWith("/build")) {
        verified = await verifyProjectWallet(nextAddress, signature);
      } else {
        verified = await walletVerify(nextAddress, signature);
      }
      setAddress(nextAddress);
      setChainId(BSC_CHAIN_ID);
      if ("user" in verified && verified.user) {
        setUser(verified.user);
        localStorage.setItem(STORAGE_KEY, nextAddress);
        localStorage.setItem(STORAGE_CHAIN_KEY, BSC_CHAIN_ID);
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_CHAIN_KEY);
      }
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
    providerRef.current = null;
    setActiveProvider(null);
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
