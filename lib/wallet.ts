export const BSC_CHAIN_ID = "0x38";

const BSC_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export type WalletFlavor = "metamask" | "walletconnect" | "coinbase" | "binance" | "trust";

export interface InjectedProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBinance?: boolean;
  isTrust?: boolean;
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

function pickProvider(walletId?: WalletFlavor) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum) return null;
  const candidates = ethereum.providers?.length ? ethereum.providers : [ethereum];
  const pickers: Record<WalletFlavor, (provider: InjectedProvider) => boolean> = {
    metamask: (provider) => !!provider.isMetaMask,
    walletconnect: () => true,
    coinbase: (provider) => !!provider.isCoinbaseWallet,
    binance: (provider) => !!provider.isBinance,
    trust: (provider) => !!provider.isTrust,
  };
  if (!walletId) return candidates[0] || ethereum;
  return candidates.find(pickers[walletId]) || candidates[0] || ethereum;
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
  const provider = pickProvider(walletId);
  if (!provider) {
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
