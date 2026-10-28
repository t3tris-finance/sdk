import { createApiClient, type T3trisClientOptions } from "./createClient";
import { createOnchainClient, type T3trisWalletClient, type WalletOptions } from "./onchain";
import type { T3trisClient } from "./public";

export type T3trisApiOptions = T3trisClientOptions & {
  walletClient?: never;
  publicClient?: never;
  provider?: never;
  account?: never;
};
export type T3trisWalletOptions = WalletOptions & { apiKey?: never; baseUrl?: never };

/** API credentials belong on a server. Wallet mode never reads API environment variables. */
export function createT3trisClient(options: T3trisWalletOptions): T3trisWalletClient;
export function createT3trisClient(options?: T3trisApiOptions): T3trisClient;
export function createT3trisClient(
  options: T3trisApiOptions | T3trisWalletOptions = {},
): T3trisClient | T3trisWalletClient {
  if (
    ("provider" in options && options.provider !== undefined) ||
    ("walletClient" in options && options.walletClient !== undefined)
  ) {
    if ("apiKey" in options || "baseUrl" in options) {
      throw new Error(
        "Use separate API and wallet clients. Never provide an API key to a browser wallet client.",
      );
    }
    return createOnchainClient(options as T3trisWalletOptions);
  }
  return createApiClient(options as T3trisApiOptions);
}
