export const BSC_CHAIN_ID = "0x38";

const BSC_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export type WalletFlavor = "metamask" | "walletconnect" | "coinbase" | "binance" | "trust" | "okx" | "injected";

export interface InjectedProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBinance?: boolean;
  isBinanceChain?: boolean;
  isTrustWallet?: boolean;
  isTrust?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  providerInfo?: { name?: string; rdns?: string; uuid?: string };
  selectedProvider?: InjectedProvider;
  providers?: InjectedProvider[];
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function debugWallet(event: string, payload: Record<string, unknown>) {
  if (!isDev()) return;
  console.info(`[wallet] ${event}`, payload);
}

function getProviderLabel(provider: InjectedProvider) {
  return `${provider.providerInfo?.name || ""} ${provider.providerInfo?.rdns || ""}`.toLowerCase();
}

function getProviderFlags(provider: InjectedProvider) {
  return {
    isMetaMask: !!provider.isMetaMask,
    isCoinbaseWallet: !!provider.isCoinbaseWallet,
    isBinance: !!provider.isBinance,
    isBinanceChain: !!provider.isBinanceChain,
    isTrust: !!provider.isTrust,
    isTrustWallet: !!provider.isTrustWallet,
    isOkxWallet: !!provider.isOkxWallet || !!provider.isOKExWallet,
  };
}

function uniqueProviders(source: InjectedProvider[]) {
  return Array.from(new Set(source.filter(Boolean)));
}

export function getInjectedProviders() {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum) return [];
  const nested = ethereum.providers?.length ? ethereum.providers : [];
  const source = nested.length
    ? [...nested, ethereum.selectedProvider, ethereum]
    : ethereum.selectedProvider
      ? [ethereum.selectedProvider, ethereum]
      : [ethereum];
  const candidates = uniqueProviders(source.filter(Boolean) as InjectedProvider[]);
  debugWallet("providers.detected", {
    count: candidates.length,
    providers: candidates.map((provider) => ({
      label: getProviderLabel(provider),
      flags: getProviderFlags(provider),
    })),
  });
  return candidates;
}

export function getDefaultInjectedProvider() {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum) return null;
  const candidates = getInjectedProviders();
  return candidates[0] || ethereum;
}

export function pickInjectedProvider(walletId?: WalletFlavor) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum) return null;
  const candidates = getInjectedProviders();
  const pickers: Record<WalletFlavor, (provider: InjectedProvider) => boolean> = {
    metamask: (provider) => {
      const label = getProviderLabel(provider);
      return (!!provider.isMetaMask || label.includes("metamask"))
        && !provider.isTrust
        && !provider.isTrustWallet
        && !provider.isCoinbaseWallet
        && !provider.isBinance
        && !provider.isBinanceChain
        && !provider.isOkxWallet
        && !provider.isOKExWallet
        && !label.includes("trust")
        && !label.includes("coinbase")
        && !label.includes("binance")
        && !label.includes("okx")
        && !label.includes("okex");
    },
    walletconnect: (provider) => getProviderLabel(provider).includes("walletconnect"),
    coinbase: (provider) => !!provider.isCoinbaseWallet || getProviderLabel(provider).includes("coinbase"),
    binance: (provider) => !!provider.isBinance || !!provider.isBinanceChain || getProviderLabel(provider).includes("binance"),
    trust: (provider) => !!provider.isTrust || !!provider.isTrustWallet || getProviderLabel(provider).includes("trust"),
    okx: (provider) => !!provider.isOkxWallet || !!provider.isOKExWallet || getProviderLabel(provider).includes("okx") || getProviderLabel(provider).includes("okex"),
    injected: () => true,
  };
  const matched = !walletId ? (candidates[0] || ethereum) : (candidates.find(pickers[walletId]) || null);
  debugWallet("provider.selected", {
    selectedWallet: walletId || "default",
    matched: matched ? { label: getProviderLabel(matched), flags: getProviderFlags(matched) } : null,
  });
  return matched;
}

export async function ensureBscMainnet(provider: InjectedProvider) {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (chainId === BSC_CHAIN_ID) return chainId;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }],
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : undefined;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [BSC_PARAMS],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }],
    });
  }

  const switchedChainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (switchedChainId !== BSC_CHAIN_ID) {
    throw new Error("Please switch your wallet to BNB Smart Chain to continue.");
  }
  return switchedChainId;
}

export async function connectInjectedWallet(walletId?: WalletFlavor) {
  const provider = pickInjectedProvider(walletId);
  if (!provider) {
    if (walletId) {
      throw new Error(`The selected wallet (${walletId}) is not available in this browser. Open that wallet extension/app and try again.`);
    }
    throw new Error("No browser wallet found. Install MetaMask, Trust Wallet, Binance Web3 Wallet, or another injected wallet.");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("Wallet did not return an account.");
  await ensureBscMainnet(provider);
  return {
    address,
    provider,
  };
}

export function formatWalletError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Wallet connection failed. Please try again.";
}
