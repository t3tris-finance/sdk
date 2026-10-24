/**
 * Wallet adapters for the engine. `bindEngineClients` accepts the wallet
 * client the caller already has (viem, wagmi, RainbowKit, or anything else
 * that can send a transaction). `createEngineClients` builds that same pair
 * from a raw EIP-1193 provider. This module does not open a connect modal
 * and does not depend on wagmi or RainbowKit.
 */

import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
  type Hex,
  type TypedData,
  type TypedDataDomain,
} from "viem";
import type { EnginePublicClient, EngineReceipt, EngineWalletClient } from "./engine";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export type { EIP1193Provider };

/** The browser's injected provider (MetaMask & co), or null outside a browser
 *  / without an extension. Rabby replaces this object when both extensions are
 *  installed, so a chooser must use {@link watchInjectedWallets}. */
export function injectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

/** One EIP-6963 wallet, or a legacy `window.ethereum` fallback. */
export interface DiscoveredWallet {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: EIP1193Provider;
}

type WalletAnnounceTarget = EventTarget & {
  ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] };
};

interface WalletAnnounceDetail {
  info?: { uuid?: string; name?: string; icon?: string; rdns?: string };
  provider?: EIP1193Provider;
}

/** The wallet to restore. A saved choice waits until that extension announces.
 * It is never replaced by whichever provider showed up first. With no saved
 * choice, the only installed wallet is the one to use. */
export function preferredInjectedWallet(
  wallets: readonly DiscoveredWallet[],
  savedRdns: string | null,
  savedUuid: string | null,
): DiscoveredWallet | undefined {
  if (savedRdns || savedUuid) {
    return wallets.find((wallet) => wallet.rdns === savedRdns || wallet.uuid === savedUuid);
  }
  return wallets.length === 1 ? wallets[0] : undefined;
}

function rememberWallet(found: Map<string, DiscoveredWallet>, wallet: DiscoveredWallet): void {
  for (const [key, row] of found) {
    if (row.provider === wallet.provider) found.delete(key);
  }
  found.set(wallet.uuid, wallet);
}

/** Listen for EIP-6963 wallets. Extensions answer `eip6963:requestProvider`
 * during the dispatch, and that batch is published once. A later announcement
 * publishes again. With no announcement, the legacy `window.ethereum` list is
 * one unnamed wallet. */
export function watchInjectedWallets(
  onChange: (wallets: DiscoveredWallet[]) => void,
  target: WalletAnnounceTarget | null = typeof window === "undefined" ? null : window,
): () => void {
  if (target === null) {
    onChange([]);
    return () => {};
  }
  const found = new Map<string, DiscoveredWallet>();
  let initial = true;
  const publish = () => onChange([...found.values()]);
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<WalletAnnounceDetail>).detail;
    const info = detail?.info;
    if (!info?.uuid || !detail.provider) return;
    rememberWallet(found, {
      uuid: info.uuid,
      name: info.name || "Browser wallet",
      icon: info.icon ?? "",
      rdns: info.rdns || info.uuid,
      provider: detail.provider,
    });
    if (!initial) publish();
  };
  target.addEventListener("eip6963:announceProvider", onAnnounce);
  target.dispatchEvent(new Event("eip6963:requestProvider"));
  initial = false;
  if (found.size === 0) {
    const eth = target.ethereum;
    const list =
      eth && Array.isArray(eth.providers) && eth.providers.length > 0
        ? eth.providers
        : eth
          ? [eth]
          : [];
    list.forEach((provider, index) => {
      rememberWallet(found, {
        uuid: `legacy:${index}`,
        name: list.length === 1 ? "Browser wallet" : `Browser wallet ${index + 1}`,
        icon: "",
        rdns: `legacy:${index}`,
        provider,
      });
    });
  }
  publish();
  return () => target.removeEventListener("eip6963:announceProvider", onAnnounce);
}

export interface EngineClients {
  publicClient: EnginePublicClient;
  walletClient: EngineWalletClient;
}

/** A wallet client the engine can drive. viem and wagmi clients match this. */
export interface EngineWalletClientSource {
  account?: { address: Address } | undefined;
  getChainId(): Promise<number>;
  switchChain(args: { id: number }): Promise<unknown>;
  sendTransaction(args: { account?: Address; to: Address; data: Hex; chain?: null }): Promise<Hex>;
  signTypedData(args: {
    account?: Address;
    domain: TypedDataDomain;
    types: TypedData;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<Hex>;
}

/** A public client the engine can read through. */
export interface EnginePublicClientSource {
  call(args: {
    account?: Address;
    to: Address;
    data: Hex;
    blockNumber?: bigint;
  }): Promise<{ data?: Hex | undefined }>;
  getCode(args: { address: Address }): Promise<Hex | undefined>;
  getBlock(args?: { blockTag?: "latest" }): Promise<{ timestamp: bigint }>;
  waitForTransactionReceipt(args: { hash: Hex }): Promise<EngineReceipt>;
}

/**
 * Adapt a caller-supplied wallet and public client to the engine. The
 * caller's `switchChain` is used as-is, so adding a missing network stays
 * the caller's job (wagmi does this; a raw viem client does not).
 */
export function bindEngineClients(source: {
  walletClient: EngineWalletClientSource;
  publicClient: EnginePublicClientSource;
}): EngineClients {
  const { walletClient, publicClient } = source;
  return {
    walletClient: {
      get account() {
        return walletClient.account === undefined
          ? undefined
          : { address: walletClient.account.address };
      },
      getChainId: () => walletClient.getChainId(),
      switchChain: async ({ id }) => {
        await walletClient.switchChain({ id });
      },
      sendTransaction: (args) => walletClient.sendTransaction(args),
      signTypedData: (args) => walletClient.signTypedData(args),
    },
    publicClient: {
      call: async (args) => {
        const result = await publicClient.call(args);
        return { data: result.data };
      },
      getCode: (args) => publicClient.getCode(args),
      getBlock: (args) => publicClient.getBlock(args),
      waitForTransactionReceipt: (args) => publicClient.waitForTransactionReceipt(args),
    },
  };
}

/**
 * Build the engine's clients over the injected provider. The wallet account
 * is held by reference — update it via `setAccount` after
 * `eth_requestAccounts` / `accountsChanged`.
 */
export function createEngineClients(provider: EIP1193Provider): EngineClients & {
  setAccount(account: Address | undefined): void;
} {
  const transport = custom(provider);
  const viemPublic = createPublicClient({ transport });
  let account: `0x${string}` | undefined;
  const viemWallet = createWalletClient({ transport });

  const clients: EngineClients = {
    publicClient: {
      call: async (args) => {
        // viem's `publicClient.call` returns a response object
        // (`{ data, ... }`), not the hex payload itself. Passing that object
        // through as Hex reaches viem's ABI decoder as a DataView source and
        // crashes every live balance/supply read.
        const result = await viemPublic.call({
          ...(args.account !== undefined ? { account: args.account } : {}),
          to: args.to,
          data: args.data,
          ...(args.blockNumber !== undefined ? { blockNumber: args.blockNumber } : {}),
        });
        return { data: result.data as Hex | undefined };
      },
      getCode: (args) => viemPublic.getCode(args),
      getBlock: (args) => viemPublic.getBlock(args),
      waitForTransactionReceipt: (args) => viemPublic.waitForTransactionReceipt(args),
    },
    walletClient: {
      get account() {
        return account !== undefined ? { address: account } : undefined;
      },
      getChainId: () => viemWallet.getChainId(),
      switchChain: ({ id }) => viemWallet.switchChain({ id }),
      sendTransaction: (args) =>
        viemWallet.sendTransaction({
          ...(args.account !== undefined ? { account: args.account } : {}),
          to: args.to,
          data: args.data,
          chain: null,
        } as never),
      signTypedData: (args) =>
        viemWallet.signTypedData({
          ...(args.account !== undefined ? { account: args.account } : {}),
          domain: args.domain,
          types: args.types,
          primaryType: args.primaryType,
          message: args.message,
        } as never),
    },
  };

  return {
    ...clients,
    setAccount(next: Address | undefined) {
      account = next;
    },
  };
}

/** `eth_requestAccounts` — the connect flow (the wallet pops its own chooser). */
export async function requestAccounts(provider: EIP1193Provider): Promise<Address[]> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return accounts as Address[];
}

/** Current chain id via `eth_chainId` (hex string → number). */
export async function fetchChainId(provider: EIP1193Provider): Promise<number> {
  const hex = (await provider.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(hex, 16);
}
