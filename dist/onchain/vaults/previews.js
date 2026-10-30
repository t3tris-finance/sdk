const period = ([oldTotalNetAssets, oldTotalNetSupply, managementFeeAssets, managementFeeShares, performanceFeeAssets, performanceFeeShares, periodFeeShares, pnl, updatedPps, isProfit,]) => ({
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
const entry = ([entryFeeAssets, entryFeeShares]) => ({
    entryFeeAssets,
    entryFeeShares,
});
const exit = ([exitFeeAssets, exitFeeShares]) => ({ exitFeeAssets, exitFeeShares });
const deposit = ([netDepositAssets, netDepositShares]) => ({
    netDepositAssets,
    netDepositShares,
});
const redeem = ([netRedeemAssets, netRedeemShares]) => ({
    netRedeemAssets,
    netRedeemShares,
});
const gross = ([totalAssets, totalSupply]) => ({ totalAssets, totalSupply });
const net = ([totalNetAssets, totalNetSupply]) => ({
    totalNetAssets,
    totalNetSupply,
});
const fees = ([settlementFeeShares, unclaimedSharesFee]) => ({
    settlementFeeShares,
    unclaimedSharesFee,
});
export function settlePreview(value) {
    const [last, entryFees, exitFees, deposits, redeems, grossTvl, netTvl, unclaimed, sharesToBurn, sharesToMint, assetsToT3treasury, assetsToCurator, assetsToFeeRecipient, assetsFromCurator, actualDepositedAssets, ppsHighWaterMark,] = value;
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
export function openPreview(value) {
    // OpenResult uses the same ABI layout as SettleResult, with assetsToSilo at slot 11.
    const { assetsToCurator: assetsToSilo, ...rest } = settlePreview(value);
    return { ...rest, assetsToSilo };
}
export function depositsPreview(value) {
    const [last, entryFees, deposits, grossTvl, netTvl, unclaimed, assetsToT3treasury, assetsToCurator, assetsToFeeRecipient, assetsFromCurator, sharesToFeeRecipient, sharesToMint, sharesToBurn,] = value;
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
export function redemptionsPreview(value) {
    const [last, exitFees, redeems, grossTvl, netTvl, unclaimed, currentRequestId, sharesToRedeem, assetsFromCurator, sharesToMint, sharesToBurn, assetsToFeeRecipient, assetsToSilo,] = value;
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
