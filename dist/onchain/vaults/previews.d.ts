/** Amounts use raw asset/share units; price-per-share fields use WAD. */
export interface LastPeriodData {
    oldTotalNetAssets: bigint;
    oldTotalNetSupply: bigint;
    managementFeeAssets: bigint;
    managementFeeShares: bigint;
    performanceFeeAssets: bigint;
    performanceFeeShares: bigint;
    periodFeeShares: bigint;
    pnl: bigint;
    updatedPps: bigint;
    isProfit: boolean;
}
export interface EntryFees {
    entryFeeAssets: bigint;
    entryFeeShares: bigint;
}
export interface ExitFees {
    exitFeeAssets: bigint;
    exitFeeShares: bigint;
}
export interface NetDepositFlowData {
    netDepositAssets: bigint;
    netDepositShares: bigint;
}
export interface NetRedeemFlowData {
    netRedeemAssets: bigint;
    netRedeemShares: bigint;
}
export interface GrossTvlData {
    totalAssets: bigint;
    totalSupply: bigint;
}
export interface NetTvlData {
    totalNetAssets: bigint;
    totalNetSupply: bigint;
}
export interface UnclaimedFeesData {
    settlementFeeShares: bigint;
    unclaimedSharesFee: bigint;
}
interface CommonPreview {
    lastPeriodData: LastPeriodData;
    grossTvlData: GrossTvlData;
    netTvlData: NetTvlData;
    unclaimedFeesData: UnclaimedFeesData;
    sharesToBurn: bigint;
    sharesToMint: bigint;
    assetsToFeeRecipient: bigint;
    assetsFromCurator: bigint;
}
export interface SettlePreview extends CommonPreview {
    entryFees: EntryFees;
    exitFees: ExitFees;
    netDepositFlowData: NetDepositFlowData;
    netRedeemFlowData: NetRedeemFlowData;
    assetsToT3treasury: bigint;
    assetsToCurator: bigint;
    actualDepositedAssets: bigint;
    ppsHighWaterMark: bigint;
}
export interface OpenPreview extends Omit<SettlePreview, "assetsToCurator"> {
    assetsToSilo: bigint;
}
export interface SettleDepositsPreview extends CommonPreview {
    entryFees: EntryFees;
    netDepositFlowData: NetDepositFlowData;
    assetsToT3treasury: bigint;
    assetsToCurator: bigint;
    sharesToFeeRecipient: bigint;
}
export interface SettleRedemptionsPreview extends CommonPreview {
    exitFees: ExitFees;
    netRedeemFlowData: NetRedeemFlowData;
    currentRequestId: bigint;
    sharesToRedeem: bigint;
    assetsToSilo: bigint;
}
export type SettlementPreview = SettlePreview | SettleDepositsPreview | SettleRedemptionsPreview;
type Pair = readonly [bigint, bigint];
type PeriodTuple = readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    boolean
];
export type CombinedPreviewTuple = readonly [
    PeriodTuple,
    Pair,
    Pair,
    Pair,
    Pair,
    Pair,
    Pair,
    Pair,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
];
export type FlowPreviewTuple = readonly [
    PeriodTuple,
    Pair,
    Pair,
    Pair,
    Pair,
    Pair,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
];
export declare function settlePreview(value: CombinedPreviewTuple): SettlePreview;
export declare function openPreview(value: CombinedPreviewTuple): OpenPreview;
export declare function depositsPreview(value: FlowPreviewTuple): SettleDepositsPreview;
export declare function redemptionsPreview(value: FlowPreviewTuple): SettleRedemptionsPreview;
export {};
