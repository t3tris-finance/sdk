import type { Address } from "./primitives";

/**
 * One flattened line of a vault's portfolio. Balances/values are JS numbers
 * (display data, not accounting data); borrows carry NEGATIVE `valueUsd`.
 */
export interface Holding {
  symbol: string;
  name: string;
  protocol: string; // protocol key — "aave", "pendle"…
  kind: "supply" | "borrow";
  assetAddress: Address;
  balance: number; // token units
  priceUsd: number;
  valueUsd: number;
  weight: number; // share of total, 0..1
  logoUrl?: string | null;
}

/** The vault curator wallet's whole portfolio, fetched/refreshed as one value. */
export interface VaultComposition {
  chainId: number;
  vaultAddress: Address;
  ts: number; // unix s
  holdings: Holding[];
}

export interface RiskRating {
  chainId: number;
  vaultAddress: Address;
  provider: "xerberus";
  score: number; // 0–100
  updatedAt: number; // unix s
}
