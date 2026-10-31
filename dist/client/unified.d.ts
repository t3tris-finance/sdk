import { type T3trisClientOptions } from "../api/client.js";
import type { T3trisClient } from "../api/types.js";
import { type T3trisWalletClient, type WalletOptions } from "../onchain/client.js";
export type T3trisApiOptions = T3trisClientOptions & {
    walletClient?: never;
    publicClient?: never;
    provider?: never;
    account?: never;
};
export type T3trisWalletOptions = WalletOptions & {
    apiKey?: never;
    baseUrl?: never;
};
/** API credentials belong on a server. Wallet mode never reads API environment variables. */
export declare function createT3trisClient(options: T3trisWalletOptions): T3trisWalletClient;
export declare function createT3trisClient(options?: T3trisApiOptions): T3trisClient;
