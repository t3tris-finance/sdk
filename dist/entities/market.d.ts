import type { Address } from "./primitives.js";
/**
 * One flattened line of a vault's portfolio. Balances/values are JS numbers
 * (display data, not accounting data); borrows carry NEGATIVE `valueUsd`.
 */
export interface Holding {
    symbol: string;
    name: string;
    protocol: string;
    kind: "supply" | "borrow";
    assetAddress: Address;
    balance: number;
    priceUsd: number;
    valueUsd: number;
    weight: number;
    logoUrl?: string | null;
}
/** The vault curator wallet's whole portfolio, fetched/refreshed as one value. */
export interface VaultComposition {
    chainId: number;
    vaultAddress: Address;
    ts: number;
    holdings: Holding[];
}
export interface RiskRating {
    chainId: number;
    vaultAddress: Address;
    provider: "xerberus";
    score: number;
    updatedAt: number;
}
