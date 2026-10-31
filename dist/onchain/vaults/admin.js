/**
 * Vault administration: settlement, fee schedule/claim,
 * lifecycle, whitelist, silos, address setters, sweep. Calldata goes through
 * the hand-ported selector table ({@link curateVault}); batch ops fuse their
 * sub-calls with Solady `multicall(bytes[])`.
 */
import { curateSilo, curateVault } from "../abi/admin.js";
import { bindActions, bindReads, encodeMulticall, transaction as txFlow, } from "../transport/bindings.js";
import { encodeCall, readCall } from "../transport/engine.js";
import { depositsPreview, openPreview, redemptionsPreview, settlePreview, } from "./previews.js";
/** `IVaultTypes.FeeClaimType` (uint8): the settle/open/end-of-fund fee
 * behaviour. `None` claims nothing, `Soft` claims shares only, `Full` claims
 * shares + assets. */
export const FeeClaimType = { None: 0, Soft: 1, Full: 2 };
function settleData(i, permit2Data = i.permit2Data ?? "0x") {
    const unsafe = i.unsafe ?? false;
    if (i.kind === "redemptions") {
        return encodeCall(curateVault.settleRedemptions, [i.fullClaim ?? false, unsafe, permit2Data]);
    }
    const op = i.kind === "both" ? curateVault.settleAll : curateVault.settleDeposits;
    return encodeCall(op, [i.feeClaimType ?? FeeClaimType.None, unsafe, permit2Data]);
}
function whitelistFlow(i, op) {
    if (i.addresses.length === 0) {
        throw new Error("curate.vault: whitelist batch requires at least one address");
    }
    const subcalls = i.addresses.map((addr) => encodeCall(curateVault[op], [addr, i.whitelisted]));
    return txFlow(i.chainId, i.address, encodeMulticall(subcalls));
}
const builders = {
    // settlement
    settle: (i) => txFlow(i.chainId, i.address, settleData(i)),
    // fee schedule (queued via `setNext*Fee`)
    setNextManagementFee: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setNextManagementFee, [i.wad, i.days])),
    setNextPerformanceFee: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setNextPerformanceFee, [i.wad])),
    setNextEntryFee: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setNextEntryFee, [i.wad])),
    setNextExitFee: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setNextExitFee, [i.wad])),
    // fee crystallisation / claim
    claimFees: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.claimFees, [
        i.unsafe ?? false,
        i.shares,
        i.minAssetsOut ?? 0n,
        i.permit2Data ?? "0x",
    ])),
    updateAccruedFees: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.updateAccruedFees, [])),
    /** Batch-set share balances (`updateSharesBatched`): each receiver's share
     * balance is minted or burned UP TO the target value, so re-sending an
     * entry already at target is a no-op and a partial run can resume safely.
     * Gated `UPDATE_SHARES_ROLE` on the vault. */
    updateSharesBatched: (i) => {
        if (i.receivers.length === 0) {
            throw new Error("curate.vault: updateSharesBatched requires at least one receiver");
        }
        if (i.receivers.length !== i.values.length) {
            throw new Error("curate.vault: updateSharesBatched receivers/values length mismatch");
        }
        return txFlow(i.chainId, i.address, encodeCall(curateVault.updateSharesBatched, [i.receivers, i.values]));
    },
    // deposit / transfer toggles
    setDepositEnabled: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setDepositEnabled, [i.enabled])),
    setTransferEnabled: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setTransferEnabled, [i.enabled])),
    // pause gates — `pause()`/`unpause()` take no args, so the call is the bare
    // selector; the vault's Pausable selector is byte-identical to the silo's.
    pause: (i) => txFlow(i.chainId, i.address, encodeCall(curateSilo.pause, [])),
    unpause: (i) => txFlow(i.chainId, i.address, encodeCall(curateSilo.unpause, [])),
    // lifecycle
    enableEndOfFund: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.enableEndOfFund, [
        i.feeClaimType ?? FeeClaimType.None,
        i.unsafe ?? false,
        i.permit2Data ?? "0x",
    ])),
    disableEndOfFund: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.disableEndOfFund, [
        i.unsafe ?? false,
        i.closeVault ?? false,
        i.minAssetsOut ?? 0n,
    ])),
    // whitelist toggles + batch apply
    setDepositWhitelistEnabled: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setDepositWhitelistEnabled, [i.enabled])),
    setWithdrawWhitelistEnabled: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setWithdrawWhitelistEnabled, [i.enabled])),
    applyDepositWhitelist: (i) => whitelistFlow(i, "setDepositWhitelisted"),
    applyWithdrawWhitelist: (i) => whitelistFlow(i, "setWithdrawWhitelisted"),
    // share metadata
    setShareNameAndSymbol: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setShareNameAndSymbol, [i.name, i.symbol])),
    setIpfsHash: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setMetadataHash, [i.hash])),
    // address setters
    setCurator: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setCurator, [i.curator])),
    setFeeRecipient: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setFeeRecipient, [i.feeRecipient])),
    setOracle: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setOracle, [i.oracle])),
    setT3treasury: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setTreasury, [i.treasury])),
    // silos — `setXSilo(silo, unsafeOut, unsafeIn)`
    setSyncSilo: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setSyncSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false])),
    setDepositSilo: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setDepositSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false])),
    setRedeemSilo: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.setRedeemSilo, [i.silo, i.unsafeOut ?? false, i.unsafeIn ?? false])),
    claimSilosPnl: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.claimSilosPnl, [
        i.sync ?? false,
        i.deposit ?? false,
        i.unsafe ?? false,
        i.redeemRequestId ?? 0n,
    ])),
    // recover a stray token
    sweep: (i) => txFlow(i.chainId, i.address, encodeCall(curateVault.sweep, [i.token])),
};
/** Build the `curate.vault` namespace: writes + read-only previews/queue reads. */
export function makeVaultActions(clients) {
    const read = {
        curator: async (i) => (await readCall(curateVault.curator, clients.publicClient, {
            address: i.address,
            args: [],
        }))[0],
        isOpen: async (i) => (await readCall(curateVault.vaultOpen, clients.publicClient, {
            address: i.address,
            args: [],
        }))[0],
        /** Combined settlement preview with named asset flows and fee breakdown. */
        previewSettleAll: async (i) => settlePreview((await readCall(curateVault.previewSettleAll, clients.publicClient, { address: i.address, args: [i.feeClaimType ?? FeeClaimType.None] }))[0]),
        previewSettleDeposits: async (i) => depositsPreview((await readCall(curateVault.previewSettleDeposits, clients.publicClient, { address: i.address, args: [i.feeClaimType ?? FeeClaimType.None] }))[0]),
        previewSettleRedemptions: async (i) => redemptionsPreview((await readCall(curateVault.previewSettleRedemptions, clients.publicClient, { address: i.address, args: [i.fullClaim ?? false] }))[0]),
        previewEnableEndOfFund: async (i) => openPreview((await readCall(curateVault.previewEnableEndOfFund, clients.publicClient, { address: i.address, args: [i.feeClaimType ?? FeeClaimType.None] }))[0]),
        previewClaimFees: async (i) => (await readCall(curateVault.previewClaimFees, clients.publicClient, {
            address: i.address,
            args: [i.shares],
        }))[0],
        /** Live share balance of one holder — the vault IS the share token. Used
         * to skip batched-mint entries already at their target balance. */
        balanceOf: async (i) => (await readCall(curateVault.balanceOf, clients.publicClient, {
            address: i.address,
            args: [i.owner],
        }))[0],
        // queued fee changes (`getNext*Fee`) — decoded to { pending, wad } objects;
        // management also carries its independently-queued accrual period.
        nextEntryFee: async (i) => {
            const [pending, wad] = await readCall(curateVault.nextEntryFee, clients.publicClient, { address: i.address, args: [] });
            return { pending, wad };
        },
        nextExitFee: async (i) => {
            const [pending, wad] = await readCall(curateVault.nextExitFee, clients.publicClient, { address: i.address, args: [] });
            return { pending, wad };
        },
        nextPerformanceFee: async (i) => {
            const [pending, wad] = await readCall(curateVault.nextPerformanceFee, clients.publicClient, { address: i.address, args: [] });
            return { pending, wad };
        },
        nextManagementFee: async (i) => {
            // The ABI has ONE tuple output. Destructuring the outer return as four
            // values treated the tuple object itself as `pending` (always truthy).
            const [[pending, daysPending, wad, days]] = await readCall(curateVault.nextManagementFee, clients.publicClient, { address: i.address, args: [] });
            return { pending, daysPending, wad, days };
        },
    };
    return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
