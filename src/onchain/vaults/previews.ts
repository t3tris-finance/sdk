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
  boolean,
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
  bigint,
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
  bigint,
];

const period = ([
  oldTotalNetAssets,
  oldTotalNetSupply,
  managementFeeAssets,
  managementFeeShares,
  performanceFeeAssets,
  performanceFeeShares,
  periodFeeShares,
  pnl,
  updatedPps,
  isProfit,
]: PeriodTuple): LastPeriodData => ({
  oldTotalNetAssets,
  oldTotalNetSupply,
  managementFeeAssets,
  managementFeeShares,
  performanceFeeAssets,
  performanceFeeShares,
  periodFeeShares,
  pnl,
  updatedPps,
  isProfit,
});
const entry = ([entryFeeAssets, entryFeeShares]: Pair): EntryFees => ({
  entryFeeAssets,
  entryFeeShares,
});
const exit = ([exitFeeAssets, exitFeeShares]: Pair): ExitFees => ({ exitFeeAssets, exitFeeShares });
const deposit = ([netDepositAssets, netDepositShares]: Pair): NetDepositFlowData => ({
  netDepositAssets,
  netDepositShares,
});
const redeem = ([netRedeemAssets, netRedeemShares]: Pair): NetRedeemFlowData => ({
  netRedeemAssets,
  netRedeemShares,
});
const gross = ([totalAssets, totalSupply]: Pair): GrossTvlData => ({ totalAssets, totalSupply });
const net = ([totalNetAssets, totalNetSupply]: Pair): NetTvlData => ({
  totalNetAssets,
  totalNetSupply,
});
const fees = ([settlementFeeShares, unclaimedSharesFee]: Pair): UnclaimedFeesData => ({
  settlementFeeShares,
  unclaimedSharesFee,
});

export function settlePreview(value: CombinedPreviewTuple): SettlePreview {
  const [
    last,
    entryFees,
    exitFees,
    deposits,
    redeems,
    grossTvl,
    netTvl,
    unclaimed,
    sharesToBurn,
    sharesToMint,
    assetsToT3treasury,
    assetsToCurator,
    assetsToFeeRecipient,
    assetsFromCurator,
    actualDepositedAssets,
    ppsHighWaterMark,
  ] = value;
  return {
    lastPeriodData: period(last),
    entryFees: entry(entryFees),
    exitFees: exit(exitFees),
    netDepositFlowData: deposit(deposits),
    netRedeemFlowData: redeem(redeems),
    grossTvlData: gross(grossTvl),
    netTvlData: net(netTvl),
    unclaimedFeesData: fees(unclaimed),
    sharesToBurn,
    sharesToMint,
    assetsToT3treasury,
    assetsToCurator,
    assetsToFeeRecipient,
    assetsFromCurator,
    actualDepositedAssets,
    ppsHighWaterMark,
  };
}
export function openPreview(value: CombinedPreviewTuple): OpenPreview {
  // OpenResult uses the same ABI layout as SettleResult, with assetsToSilo at slot 11.
  const { assetsToCurator: assetsToSilo, ...rest } = settlePreview(value);
  return { ...rest, assetsToSilo };
}
export function depositsPreview(value: FlowPreviewTuple): SettleDepositsPreview {
  const [
    last,
    entryFees,
    deposits,
    grossTvl,
    netTvl,
    unclaimed,
    assetsToT3treasury,
    assetsToCurator,
    assetsToFeeRecipient,
    assetsFromCurator,
    sharesToFeeRecipient,
    sharesToMint,
    sharesToBurn,
  ] = value;
  return {
    lastPeriodData: period(last),
    entryFees: entry(entryFees),
    netDepositFlowData: deposit(deposits),
    grossTvlData: gross(grossTvl),
    netTvlData: net(netTvl),
    unclaimedFeesData: fees(unclaimed),
    assetsToT3treasury,
    assetsToCurator,
    assetsToFeeRecipient,
    assetsFromCurator,
    sharesToFeeRecipient,
    sharesToMint,
    sharesToBurn,
  };
}
export function redemptionsPreview(value: FlowPreviewTuple): SettleRedemptionsPreview {
  const [
    last,
    exitFees,
    redeems,
    grossTvl,
    netTvl,
    unclaimed,
    currentRequestId,
    sharesToRedeem,
    assetsFromCurator,
    sharesToMint,
    sharesToBurn,
    assetsToFeeRecipient,
    assetsToSilo,
  ] = value;
  return {
    lastPeriodData: period(last),
    exitFees: exit(exitFees),
    netRedeemFlowData: redeem(redeems),
    grossTvlData: gross(grossTvl),
    netTvlData: net(netTvl),
    unclaimedFeesData: fees(unclaimed),
    currentRequestId,
    sharesToRedeem,
    assetsFromCurator,
    sharesToMint,
    sharesToBurn,
    assetsToFeeRecipient,
    assetsToSilo,
  };
}
