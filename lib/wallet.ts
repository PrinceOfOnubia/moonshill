export const BSC_CHAIN_ID = "0x38";

export const BSC_CHAIN = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain Mainnet",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
} as const;

export type WalletFlavor = "metamask" | "walletconnect" | "coinbase" | "binance" | "trust";

const walletLabels: Record<WalletFlavor, string> = {
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase Wallet",
  binance: "Binance Web3 Wallet",
  trust: "Trust Wallet",
};

type RequestArgs = { method: string; params?: unknown[] | Record<string, unknown> };

export interface InjectedProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isBinance?: boolean;
  providers?: InjectedProvider[];
  request(args: RequestArgs): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

function pickProvider(walletId?: WalletFlavor) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum) return null;

  const candidates = ethereum.providers?.length ? ethereum.providers : [ethereum];
  const pickers: Record<WalletFlavor, (provider: InjectedProvider) => boolean> = {
    metamask: (provider) => !!provider.isMetaMask,
    walletconnect: () => false,
    coinbase: (provider) => !!provider.isCoinbaseWallet,
    binance: (provider) => !!provider.isBinance,
    trust: (provider) => !!provider.isTrust,
  };

  const match = walletId ? candidates.find(pickers[walletId]) : undefined;
  return match ?? candidates[0] ?? ethereum;
}

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const msg = String((error as { message?: unknown }).message ?? "");
    if (msg) return msg;
  }
  return "An unexpected wallet error occurred.";
}

function isChainAlreadyAdded(error: unknown) {
  if (typeof error !== "object" || !error) return false;
  const code = Number((error as { code?: unknown }).code);
  return code === 4902 || code === 4901;
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
    if (!isChainAlreadyAdded(error)) throw error;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [BSC_CHAIN],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }],
    });
  }

  const switchedChainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (switchedChainId !== BSC_CHAIN_ID) {
    throw new Error("Please switch your wallet to BNB Smart Chain Mainnet.");
  }
  return switchedChainId;
}

export async function connectInjectedWallet(walletId?: WalletFlavor) {
  const provider = pickProvider(walletId);
  if (!provider) {
    throw new Error("No injected wallet was detected. Open this app in MetaMask, Trust Wallet, Coinbase Wallet, or Binance Web3 Wallet.");
  }

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("Your wallet did not return an account address.");

  await ensureBscMainnet(provider);

  return {
    address,
    provider,
    walletLabel: walletLabels[walletId ?? "metamask"],
  };
}

export function formatWalletError(error: unknown) {
  const message = messageFromError(error);
  if (/reject|denied|cancel/i.test(message)) {
    return "Wallet connection was cancelled.";
  }
  if (/switch|chain/i.test(message) && /add/i.test(message)) {
    return "BNB Smart Chain is not available in this wallet. Please add it and try again.";
  }
  return message;
}
