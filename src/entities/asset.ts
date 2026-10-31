import type { Address } from "./primitives";

/** An ERC-20 asset on a chain. */
export interface Asset {
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  tags: string[]; // "stable", "lst", "wrapped"…
  /** Last successful USD quote. Absent when the pricing poller has none. */
  latestPriceUsd?: number;
  latestPriceTs?: number;
  latestPriceSource?: "defillama" | "coingecko";
}
