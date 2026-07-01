"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { getMe, logout, resendEmailAuth, startEmailAuth, startXAuth, verifyEmailAuth } from "@/lib/api";
import type { MeResponse } from "@/lib/api";

const STORAGE_POST_AUTH_KEY = "mb_post_auth";
const STORAGE_AUTH_ACCOUNT_TYPE_KEY = "mb_auth_account_type";

interface AuthState {
  connected: boolean;
  address: string | null;
  chainId: string | null;
  user: MeResponse | null;
  ready: boolean;
  connectModalOpen: boolean;
  connectError: string | null;
  authTarget: "user" | "project";
  openConnect: (nextPath?: string, accountType?: "user" | "project") => void;
  closeConnect: () => void;
  startEmailLogin: (email: string) => Promise<{ email: string; resendAfterSeconds: number; expiresAt: string }>;
  verifyEmailLogin: (email: string, code: string) => Promise<{ nextPath: string; hasSession: boolean }>;
  resendEmailLogin: (email: string) => Promise<{ resendAfterSeconds: number; expiresAt: string }>;
  loginWithX: () => Promise<void>;
  disconnect: () => void;
  refreshUser: () => Promise<MeResponse | null>;
}

const AuthCtx = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [authTarget, setAuthTarget] = useState<"user" | "project">("user");

  const refreshUser = useCallback(async () => {
    try {
      const next = await getMe();
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const storedTarget = localStorage.getItem(STORAGE_AUTH_ACCOUNT_TYPE_KEY);
        if (storedTarget === "project") {
          setAuthTarget("project");
        }
      } catch {
        /* ignore */
      }
      await refreshUser();
      setReady(true);
    })();
  }, [refreshUser]);

  const openConnect = useCallback((nextPath = "/home", accountType: "user" | "project" = "user") => {
    try {
      localStorage.setItem(STORAGE_POST_AUTH_KEY, nextPath);
      localStorage.setItem(STORAGE_AUTH_ACCOUNT_TYPE_KEY, accountType);
    } catch {
      /* ignore */
    }
    setAuthTarget(accountType);
    setConnectError(null);
    setConnectModalOpen(true);
  }, []);

  const closeConnect = useCallback(() => {
    setConnectModalOpen(false);
    setConnectError(null);
  }, []);

  const startEmailLogin = useCallback(async (email: string) => {
    setConnectError(null);
    try {
      const result = await startEmailAuth(email, authTarget);
      return {
        email: result.email,
        resendAfterSeconds: result.resendAfterSeconds,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send verification code.";
      setConnectError(message);
      throw error;
    }
  }, [authTarget]);

  const verifyEmailLogin = useCallback(async (email: string, code: string) => {
    setConnectError(null);
    const nextPath = typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_POST_AUTH_KEY) || (authTarget === "project" ? "/build" : "/home"))
      : authTarget === "project" ? "/build" : "/home";

    try {
      try {
        await logout();
      } catch {
        /* ignore */
      }
      const result = await verifyEmailAuth(email, code, authTarget);
      if (result.user) {
        setUser(result.user);
        setConnectModalOpen(false);
        return { nextPath, hasSession: true };
      }
      setUser(null);
      setConnectModalOpen(false);
      return { nextPath, hasSession: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not verify code.";
      setConnectError(message);
      throw error;
    }
  }, [authTarget]);

  const resendEmailLogin = useCallback(async (email: string) => {
    setConnectError(null);
    try {
      const result = await resendEmailAuth(email, authTarget);
      return {
        resendAfterSeconds: result.resendAfterSeconds,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not resend verification code.";
      setConnectError(message);
      throw error;
    }
  }, [authTarget]);

  const loginWithX = useCallback(async () => {
    setConnectError(null);
    const nextPath = typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_POST_AUTH_KEY) || (authTarget === "project" ? "/build" : "/home"))
      : authTarget === "project" ? "/build" : "/home";
    try {
      try {
        await logout();
      } catch {
        /* ignore */
      }
      const response = await startXAuth(authTarget, nextPath);
      window.location.href = response.redirectUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not continue with X.";
      setConnectError(message);
      throw error;
    }
  }, [authTarget]);

  const disconnect = useCallback(() => {
    setUser(null);
    setConnectError(null);
    try {
      void logout();
      localStorage.removeItem(STORAGE_POST_AUTH_KEY);
      localStorage.removeItem(STORAGE_AUTH_ACCOUNT_TYPE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    connected: !!user,
    address: user?.wallet || null,
    chainId: null,
    user,
    ready,
    connectModalOpen,
    connectError,
    authTarget,
    openConnect,
    closeConnect,
    startEmailLogin,
    verifyEmailLogin,
    resendEmailLogin,
    loginWithX,
    disconnect,
    refreshUser,
  }), [
    user,
    ready,
    connectModalOpen,
    connectError,
    authTarget,
    openConnect,
    closeConnect,
    startEmailLogin,
    verifyEmailLogin,
    resendEmailLogin,
    loginWithX,
    disconnect,
    refreshUser,
  ]);

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <ConnectModal />
    </AuthCtx.Provider>
  );
}
