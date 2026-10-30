import { describe, expect, test } from "bun:test";
import { type AbiParameter, encodeAbiParameters } from "viem";
import { createT3trisClient } from "../../src";
import { curateVault } from "../../src/onchain/abi/admin";

const vault = "0x1111111111111111111111111111111111111111" as const;
const period = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, true] as const;
const pairs = [
  [10n, 11n],
  [12n, 13n],
  [14n, 15n],
  [16n, 17n],
  [18n, 19n],
  [20n, 21n],
  [22n, 23n],
] as const;
const combined = [period, ...pairs, 24n, 25n, 26n, 27n, 28n, 29n, 30n, 31n] as const;
const flow = [
  period,
  pairs[0],
  pairs[1],
  pairs[2],
  pairs[3],
  pairs[4],
  24n,
  25n,
  26n,
  27n,
  28n,
  29n,
  30n,
] as const;
function fixture(abi: readonly AbiParameter[], value: readonly unknown[]) {
  const data = encodeAbiParameters(abi, [value]);
  return createT3trisClient({
    walletClient: {
      getChainId: async () => 42161,
      getAddresses: async () => [vault],
      sendTransaction: async () => {
        throw new Error("Read must not submit");
      },
    },
    publicClient: {
      getChainId: async () => 42161,
      getCode: async () => "0x",
      call: async () => ({ data }),
    },
  });
}

describe("named contract previews", () => {
  test("combined settlement maps every nested and scalar field", async () => {
    const client = fixture(curateVault.previewSettleAll.out, combined);
    const result = await client.vaults.read.previewSettleAll({ chainId: 42161, vault });
    expect(result).toEqual({
      lastPeriodData: {
        oldTotalNetAssets: 1n,
        oldTotalNetSupply: 2n,
        managementFeeAssets: 3n,
        managementFeeShares: 4n,
        performanceFeeAssets: 5n,
        performanceFeeShares: 6n,
        periodFeeShares: 7n,
        pnl: 8n,
        updatedPps: 9n,
        isProfit: true,
      },
      entryFees: { entryFeeAssets: 10n, entryFeeShares: 11n },
      exitFees: { exitFeeAssets: 12n, exitFeeShares: 13n },
      netDepositFlowData: { netDepositAssets: 14n, netDepositShares: 15n },
      netRedeemFlowData: { netRedeemAssets: 16n, netRedeemShares: 17n },
      grossTvlData: { totalAssets: 18n, totalSupply: 19n },
      netTvlData: { totalNetAssets: 20n, totalNetSupply: 21n },
      unclaimedFeesData: { settlementFeeShares: 22n, unclaimedSharesFee: 23n },
      sharesToBurn: 24n,
      sharesToMint: 25n,
      assetsToT3treasury: 26n,
      assetsToCurator: 27n,
      assetsToFeeRecipient: 28n,
      assetsFromCurator: 29n,
      actualDepositedAssets: 30n,
      ppsHighWaterMark: 31n,
    });
  });
  test("open and end-of-fund name the silo flow separately from curator payout", async () => {
    for (const method of ["previewOpen", "previewEnableEndOfFund"] as const) {
      const client = fixture(curateVault.previewOpenFund.out, combined);
      const result = await client.vaults.read[method]({ chainId: 42161, vault });
      expect(result.assetsToSilo).toBe(27n);
      expect(result.assetsFromCurator).toBe(29n);
      expect("assetsToCurator" in result).toBe(false);
    }
  });
  test("deposit-only and redemption-only layouts have independent meanings", async () => {
    const client = fixture(curateVault.previewSettleDeposits.out, flow);
    const deposits = await client.vaults.read.previewSettleDeposits({ chainId: 42161, vault });
    expect(deposits.assetsFromCurator).toBe(27n);
    expect(deposits.sharesToFeeRecipient).toBe(28n);
    expect(deposits.sharesToMint).toBe(29n);
    expect(deposits.sharesToBurn).toBe(30n);
    expect(deposits.netDepositFlowData).toEqual({ netDepositAssets: 12n, netDepositShares: 13n });
    const redemptions = await client.vaults.read.previewSettleRedemptions({
      chainId: 42161,
      vault,
    });
    expect(redemptions.currentRequestId).toBe(24n);
    expect(redemptions.sharesToRedeem).toBe(25n);
    expect(redemptions.assetsFromCurator).toBe(26n);
    expect(redemptions.assetsToFeeRecipient).toBe(29n);
    expect(redemptions.assetsToSilo).toBe(30n);
    expect(redemptions.netRedeemFlowData).toEqual({ netRedeemAssets: 12n, netRedeemShares: 13n });
  });
});
