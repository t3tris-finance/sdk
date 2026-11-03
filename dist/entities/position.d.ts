import type { Address } from "./primitives.js";
/** A wallet's stake in one vault. Share and asset amounts are exact decimal
 * strings (wads); `depositedValueUsd` is the USD worth of lifetime deposits
 * (null until a price exists). */
/** Cash-flow-neutral cumulative PnL in underlying asset base units, sampled
 * at historical valuation/position blocks (never today's shares backfilled). */
export interface PositionPnlPoint {
    ts: number;
    block: number;
    valueAssets: string;
    netContributedAssets: string;
    pnlAssets: string;
}
export interface PositionPnlHistory {
    chainId: number;
    vaultAddress: Address;
    ownerAddress: Address;
    points: PositionPnlPoint[];
}
export interface Position {
    chainId: number;
    vaultAddress: Address;
    ownerAddress: Address;
    pendingDepositAssets: string;
    claimableDepositShares: string;
    pendingRedeemShares: string;
    claimableRedeemAssets: string;
    recoverableRedeemSiloShares: string;
    shares: string;
    depositedTotal: string;
    withdrawnTotal: string;
    depositedValueUsd: string | null;
    costBasisAssets: string;
    realizedPnlAssets: string;
    firstDepositTs?: number;
    lastUpdatedBlock: number;
    lastUpdatedTs: number;
}
