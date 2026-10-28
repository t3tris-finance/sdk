import type { Address, EIP1193Provider } from "viem";

export type { EIP1193Provider };

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

/** Optional discovery helper. Client construction never requests wallet access. */
export function injectedProvider(): EIP1193Provider | null {
  return typeof window === "undefined" ? null : (window.ethereum ?? null);
}
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
export function preferredInjectedWallet(
  wallets: readonly DiscoveredWallet[],
  savedRdns: string | null,
  savedUuid: string | null,
): DiscoveredWallet | undefined {
  if (savedRdns || savedUuid)
    return wallets.find((wallet) => wallet.rdns === savedRdns || wallet.uuid === savedUuid);
  return wallets.length === 1 ? wallets[0] : undefined;
}
export function watchInjectedWallets(
  onChange: (wallets: DiscoveredWallet[]) => void,
  target: WalletAnnounceTarget | null = typeof window === "undefined" ? null : window,
): () => void {
  if (!target) {
    onChange([]);
    return () => {};
  }
  const found = new Map<string, DiscoveredWallet>();
  let initial = true;
  const remember = (wallet: DiscoveredWallet) => {
    for (const [key, row] of found) if (row.provider === wallet.provider) found.delete(key);
    found.set(wallet.uuid, wallet);
  };
  const publish = () => onChange([...found.values()]);
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<WalletAnnounceDetail>).detail;
    const info = detail?.info;
    if (!info?.uuid || !detail.provider) return;
    remember({
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
  if (!found.size) {
    const eth = target.ethereum;
    const list = eth?.providers?.length ? eth.providers : eth ? [eth] : [];
    list.forEach((provider, index) => {
      remember({
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
export async function requestAccounts(provider: EIP1193Provider): Promise<Address[]> {
  return provider.request({ method: "eth_requestAccounts" });
}
export async function fetchChainId(provider: EIP1193Provider): Promise<number> {
  return Number.parseInt(await provider.request({ method: "eth_chainId" }), 16);
}
