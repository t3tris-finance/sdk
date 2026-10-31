import type { VaultSnapshot } from "./vault.js";
/** Inputs shared by the catalog and the Earn performance chart. */
export type PerformanceSnapshot = Pick<VaultSnapshot, "ts" | "pricePerShareEffective" | "totalNetAssets" | "totalSupply"> & Partial<Pick<VaultSnapshot, "pricePerShare" | "trigger">>;
type Nav = {
    ts: number;
    pps: number;
    tvl: number;
    assets: bigint;
    supply: bigint;
};
/** Distinct valuation anchors, not every flat-price settlement or poll. */
export declare function valuationNavs(history: PerformanceSnapshot[]): Nav[];
/** Linear, TVL-and-time-weighted APY with a prorated opening interval and a
 * bounded forward tail. A period with no in-window valuation is N/A. */
export declare function weightedApyUpTo(navs: Nav[], windowStart: number, upTo: number): number | null;
export type PerformanceRange = "D" | "W" | "M" | "Y" | "ALL";
/** The detail BFF's history identity is tier + timestamp (not block). Keep
 * the last ordered observation at a timestamp for chart/APY presentation;
 * the API's raw rows remain available and unchanged. */
export declare function canonicalPerformanceHistory<T extends PerformanceSnapshot & {
    tier: string;
}>(history: T[]): T[];
/** Chart's APY samples, including the range-specific leading segment. The
 * rightmost non-null sample is the number shown in the vault's APY tile. */
export declare function chartApyPoints(history: PerformanceSnapshot[], now: number, baseline: PerformanceSnapshot[], horizonSec: number, range: PerformanceRange): {
    ts: number;
    apy: number | null;
}[];
export declare function latestChartApy(history: PerformanceSnapshot[], now: number, baseline: PerformanceSnapshot[], horizonSec: number, range: PerformanceRange): number | null;
export {};
