/**
 * Vault administration: settlement, fee schedule/claim,
 * lifecycle, whitelist, silos, address setters, sweep. Calldata goes through
 * the hand-ported selector table ({@link curateVault}); batch ops fuse their
 * sub-calls with Solady `multicall(bytes[])`.
 */

import type { Address, Hex } from "viem";
import { curateSilo, curateVault } from "../abi/admin";
import {
  bindActions,
  bindReads,
  encodeMulticall,
  transaction as txFlow,
} from "../transport/bindings";
import { encodeCall, type OnchainClients, readCall } from "../transport/engine";
import {
  type CombinedPreviewTuple,
  depositsPreview,
  type FlowPreviewTuple,
  openPreview,
  redemptionsPreview,
  settlePreview,
} from "./previews";

/** `IVaultTypes.FeeClaimType` (uint8): the settle/open/end-of-fund fee
 * behaviour. `None` claims nothing, `Soft` claims shares only, `Full` claims
 * shares + assets. */
export const FeeClaimType = { None: 0, Soft: 1, Full: 2 } as const;
export type FeeClaimType = (typeof FeeClaimType)[keyof typeof FeeClaimType];

/** Which settle entrypoint: deposits → `settleDeposits`, redemptions →
 * `settleRedemptions`, both → `settleAll`. */
export type SettleKind = "deposits" | "redemptions" | "both";

/** A queued fee change awaiting activation (the `getNext*Fee` reads): `pending`
 * is the queue flag, `wad` the queued rate. */
export interface QueuedFee {
  readonly pending: boolean;
  readonly wad: bigint;
}

/** The queued management fee also queues its accrual period, which pends
 * independently of the rate (`daysPending` / `days`). */
export interface QueuedManagementFee extends QueuedFee {
  readonly daysPending: boolean;
  readonly days: number;
}

export interface Target {
  readonly vault: Address;
  readonly chainId: number;
}

export type SettleInput = Target & {
  readonly unsafe?: boolean;
  readonly permit2Data?: Hex;
} & (
    | {
        readonly kind: "both" | "deposits";
        readonly feeClaimType?: FeeClaimType;
        readonly fullClaim?: never;
      }
    | { readonly kind: "redemptions"; readonly fullClaim?: boolean; readonly feeClaimType?: never }
  );

function settleData(i: SettleInput, permit2Data = i.permit2Data ?? "0x"): Hex {
  const unsafe = i.unsafe ?? false;
  if (i.kind === "redemptions") {
    return encodeCall(curateVault.settleRedemptions, [i.fullClaim ?? false, unsafe, permit2Data]);
  }
  const op = i.kind === "both" ? curateVault.settleAll : curateVault.settleDeposits;
  return encodeCall(op, [i.feeClaimType ?? FeeClaimType.None, unsafe, permit2Data]);
}

export interface WhitelistBatchInput extends Target {
  /** The addresses to add (`whitelisted: true`) or remove (`false`) in one tx. */
  readonly addresses: readonly Address[];
  readonly whitelisted: boolean;
}

function whitelistFlow(
  i: WhitelistBatchInput,
  op: "setDepositWhitelisted" | "setWithdrawWhitelisted",
): ReturnType<typeof txFlow> {
  if (i.addresses.length === 0) {
    throw new Error("curate.vault: whitelist batch requires at least one address");
  }
  const subcalls = i.addresses.map((addr) => encodeCall(curateVault[op], [addr, i.whitelisted]));
  return txFlow(i.chainId, i.vault, encodeMulticall(subcalls));
}

const builders = {
  // settlement
  settle: (i: SettleInput) => txFlow(i.chainId, i.vault, settleData(i)),

  // fee schedule (queued via `setNext*Fee`)
  setNextManagementFee: (i: Target & { wad: bigint; days: number }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setNextManagementFee, [i.wad, i.days])),
  setNextPerformanceFee: (i: Target & { wad: bigint }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setNextPerformanceFee, [i.wad])),
  setNextEntryFee: (i: Target & { wad: bigint }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setNextEntryFee, [i.wad])),
  setNextExitFee: (i: Target & { wad: bigint }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setNextExitFee, [i.wad])),

  // fee crystallisation / claim
  claimFees: (
    i: Target & { shares: bigint; unsafe?: boolean; minAssetsOut?: bigint; permit2Data?: Hex },
  ) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.claimFees, [
        i.unsafe ?? false,
        i.shares,
        i.minAssetsOut ?? 0n,
        i.permit2Data ?? "0x",
      ]),
    ),
  updateAccruedFees: (i: Target) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.updateAccruedFees, [])),

  /** Batch-set share balances (`updateSharesBatched`): each receiver's share
   * balance is minted or burned UP TO the target value, so re-sending an
   * entry already at target is a no-op and a partial run can resume safely.
   * Gated `UPDATE_SHARES_ROLE` on the vault. */
  updateSharesBatched: (
    i: Target & { receivers: readonly Address[]; values: readonly bigint[] },
  ) => {
    if (i.receivers.length === 0) {
      throw new Error("curate.vault: updateSharesBatched requires at least one receiver");
    }
    if (i.receivers.length !== i.values.length) {
      throw new Error("curate.vault: updateSharesBatched receivers/values length mismatch");
    }
    return txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.updateSharesBatched, [i.receivers, i.values]),
    );
  },

  // deposit / transfer toggles
  setDepositEnabled: (i: Target & { enabled: boolean }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setDepositEnabled, [i.enabled])),
  setTransferEnabled: (i: Target & { enabled: boolean }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setTransferEnabled, [i.enabled])),

  // pause gates — `pause()`/`unpause()` take no args, so the call is the bare
  // selector; the vault's Pausable selector is byte-identical to the silo's.
  pause: (i: Target) => txFlow(i.chainId, i.vault, encodeCall(curateSilo.pause, [])),
  unpause: (i: Target) => txFlow(i.chainId, i.vault, encodeCall(curateSilo.unpause, [])),

  // lifecycle
  open: (i: Target & { feeClaimType?: FeeClaimType; unsafe?: boolean; permit2Data?: Hex }) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.openFund, [
        i.feeClaimType ?? FeeClaimType.None,
        i.unsafe ?? false,
        i.permit2Data ?? "0x",
      ]),
    ),
  close: (i: Target & { unsafe?: boolean; minAssetsOut?: bigint }) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.closeFund, [i.unsafe ?? false, i.minAssetsOut ?? 0n]),
    ),
  enableEndOfFund: (
    i: Target & { feeClaimType?: FeeClaimType; unsafe?: boolean; permit2Data?: Hex },
  ) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.enableEndOfFund, [
        i.feeClaimType ?? FeeClaimType.None,
        i.unsafe ?? false,
        i.permit2Data ?? "0x",
      ]),
    ),
  disableEndOfFund: (
    i: Target & { unsafe?: boolean; closeVault?: boolean; minAssetsOut?: bigint },
  ) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.disableEndOfFund, [
        i.unsafe ?? false,
        i.closeVault ?? false,
        i.minAssetsOut ?? 0n,
      ]),
    ),

  // whitelist toggles + batch apply
  setDepositWhitelistEnabled: (i: Target & { enabled: boolean }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setDepositWhitelistEnabled, [i.enabled])),
  setWithdrawWhitelistEnabled: (i: Target & { enabled: boolean }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setWithdrawWhitelistEnabled, [i.enabled])),
  applyDepositWhitelist: (i: WhitelistBatchInput) => whitelistFlow(i, "setDepositWhitelisted"),
  applyWithdrawWhitelist: (i: WhitelistBatchInput) => whitelistFlow(i, "setWithdrawWhitelisted"),

  // share metadata
  setShareNameAndSymbol: (i: Target & { name: string; symbol: string }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setShareNameAndSymbol, [i.name, i.symbol])),
  setIpfsHash: (i: Target & { hash: string }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setMetadataHash, [i.hash])),

  // address setters
  setCurator: (i: Target & { curator: Address }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setCurator, [i.curator])),
  setFeeRecipient: (i: Target & { feeRecipient: Address }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setFeeRecipient, [i.feeRecipient])),
  setOracle: (i: Target & { oracle: Address }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setOracle, [i.oracle])),
  setT3treasury: (i: Target & { treasury: Address }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.setTreasury, [i.treasury])),

  // silos — `setXSilo(silo, unsafeOut, unsafeIn)`
  setSyncSilo: (i: Target & { silo: Address; unsafeOut?: boolean; unsafeIn?: boolean }) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.setSyncSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false]),
    ),
  setDepositSilo: (i: Target & { silo: Address; unsafeOut?: boolean; unsafeIn?: boolean }) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.setDepositSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false]),
    ),
  setRedeemSilo: (i: Target & { silo: Address; unsafeOut?: boolean; unsafeIn?: boolean }) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.setRedeemSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false]),
    ),
  claimSilosPnl: (
    i: Target & { sync?: boolean; deposit?: boolean; unsafe?: boolean; redeemRequestId?: bigint },
  ) =>
    txFlow(
      i.chainId,
      i.vault,
      encodeCall(curateVault.claimSilosPnl, [
        i.sync ?? false,
        i.deposit ?? false,
        i.unsafe ?? false,
        i.redeemRequestId ?? 0n,
      ]),
    ),

  // recover a stray token
  sweep: (i: Target & { token: Address }) =>
    txFlow(i.chainId, i.vault, encodeCall(curateVault.sweep, [i.token])),
};

/** Build the `curate.vault` namespace: writes + read-only previews/queue reads. */
export function makeVaultActions(clients: OnchainClients) {
  const read = {
    curator: async (i: { vault: Address }) =>
      (
        await readCall<readonly [Address]>(curateVault.curator, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    isOpen: async (i: { vault: Address }) =>
      (
        await readCall<readonly [boolean]>(curateVault.vaultOpen, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    /** Combined settlement preview with named asset flows and fee breakdown. */
    previewSettleAll: async (i: { vault: Address; feeClaimType?: FeeClaimType }) =>
      settlePreview(
        (
          await readCall<readonly [CombinedPreviewTuple]>(
            curateVault.previewSettleAll,
            clients.publicClient,
            { address: i.vault, args: [i.feeClaimType ?? FeeClaimType.None] },
          )
        )[0],
      ),
    previewSettleDeposits: async (i: { vault: Address; feeClaimType?: FeeClaimType }) =>
      depositsPreview(
        (
          await readCall<readonly [FlowPreviewTuple]>(
            curateVault.previewSettleDeposits,
            clients.publicClient,
            { address: i.vault, args: [i.feeClaimType ?? FeeClaimType.None] },
          )
        )[0],
      ),
    previewSettleRedemptions: async (i: { vault: Address; fullClaim?: boolean }) =>
      redemptionsPreview(
        (
          await readCall<readonly [FlowPreviewTuple]>(
            curateVault.previewSettleRedemptions,
            clients.publicClient,
            { address: i.vault, args: [i.fullClaim ?? false] },
          )
        )[0],
      ),
    previewOpen: async (i: { vault: Address; feeClaimType?: FeeClaimType }) =>
      openPreview(
        (
          await readCall<readonly [CombinedPreviewTuple]>(
            curateVault.previewOpenFund,
            clients.publicClient,
            { address: i.vault, args: [i.feeClaimType ?? FeeClaimType.None] },
          )
        )[0],
      ),
    previewEnableEndOfFund: async (i: { vault: Address; feeClaimType?: FeeClaimType }) =>
      openPreview(
        (
          await readCall<readonly [CombinedPreviewTuple]>(
            curateVault.previewEnableEndOfFund,
            clients.publicClient,
            { address: i.vault, args: [i.feeClaimType ?? FeeClaimType.None] },
          )
        )[0],
      ),
    previewCloseFund: async (i: { vault: Address }) =>
      (
        await readCall<readonly [bigint]>(curateVault.previewCloseFund, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    previewClaimFees: async (i: { vault: Address; shares: bigint }) =>
      (
        await readCall<readonly [bigint]>(curateVault.previewClaimFees, clients.publicClient, {
          address: i.vault,
          args: [i.shares],
        })
      )[0],
    /** Live share balance of one holder — the vault IS the share token. Used
     * to skip batched-mint entries already at their target balance. */
    balanceOf: async (i: { vault: Address; owner: Address }) =>
      (
        await readCall<readonly [bigint]>(curateVault.balanceOf, clients.publicClient, {
          address: i.vault,
          args: [i.owner],
        })
      )[0],
    // queued fee changes (`getNext*Fee`) — decoded to { pending, wad } objects;
    // management also carries its independently-queued accrual period.
    nextEntryFee: async (i: { vault: Address }): Promise<QueuedFee> => {
      const [pending, wad] = await readCall<readonly [boolean, bigint]>(
        curateVault.nextEntryFee,
        clients.publicClient,
        { address: i.vault, args: [] },
      );
      return { pending, wad };
    },
    nextExitFee: async (i: { vault: Address }): Promise<QueuedFee> => {
      const [pending, wad] = await readCall<readonly [boolean, bigint]>(
        curateVault.nextExitFee,
        clients.publicClient,
        { address: i.vault, args: [] },
      );
      return { pending, wad };
    },
    nextPerformanceFee: async (i: { vault: Address }): Promise<QueuedFee> => {
      const [pending, wad] = await readCall<readonly [boolean, bigint]>(
        curateVault.nextPerformanceFee,
        clients.publicClient,
        { address: i.vault, args: [] },
      );
      return { pending, wad };
    },
    nextManagementFee: async (i: { vault: Address }): Promise<QueuedManagementFee> => {
      // The ABI has ONE tuple output. Destructuring the outer return as four
      // values treated the tuple object itself as `pending` (always truthy).
      const [[pending, daysPending, wad, days]] = await readCall<
        readonly [readonly [boolean, boolean, bigint, number]]
      >(curateVault.nextManagementFee, clients.publicClient, { address: i.vault, args: [] });
      return { pending, daysPending, wad, days };
    },
  };
  return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
