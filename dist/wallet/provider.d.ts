import type { Address, EIP1193Provider } from "viem";
export type { EIP1193Provider };
/** Optional discovery helper. Client construction never requests wallet access. */
export declare function injectedProvider(): EIP1193Provider | null;
export interface DiscoveredWallet {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
    provider: EIP1193Provider;
}
type WalletAnnounceTarget = EventTarget & {
    ethereum?: EIP1193Provider & {
        providers?: EIP1193Provider[];
    };
};
export declare function preferredInjectedWallet(wallets: readonly DiscoveredWallet[], savedRdns: string | null, savedUuid: string | null): DiscoveredWallet | undefined;
export declare function watchInjectedWallets(onChange: (wallets: DiscoveredWallet[]) => void, target?: WalletAnnounceTarget | null): () => void;
export declare function requestAccounts(provider: EIP1193Provider): Promise<Address[]>;
export declare function fetchChainId(provider: EIP1193Provider): Promise<number>;
