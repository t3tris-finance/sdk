import type { Address } from "./primitives";

/** A wallet's stake in one vault. Share and asset amounts are exact decimal
 * strings (wads); `depositedValueUsd` is the USD worth of lifetime deposits
 * (null until a price exists). */
export interface Position {
  chainId: number;
  vaultAddress: Address;
  ownerAddress: Address;
  // — async lifecycle (settle pipeline) —
  pendingDepositAssets: string;
  claimableDepositShares: string;
  pendingRedeemShares: string;
  claimableRedeemAssets: string;
  recoverableRedeemSiloShares: string;
  // — accounting —
  shares: string; // ownedShares, raw
  depositedTotal: string;
  withdrawnTotal: string;
  depositedValueUsd: string | null;
  costBasisAssets: string;
  realizedPnlAssets: string;
  firstDepositTs?: number; // unix s
  lastUpdatedBlock: number;
  lastUpdatedTs: number; // unix s
}
