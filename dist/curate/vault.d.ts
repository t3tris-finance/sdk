/**
 * `curate.vault.*` — the vault admin surface: settlement, fee schedule/claim,
 * lifecycle, whitelist, silos, address setters, sweep. Calldata goes through
 * the hand-ported selector table ({@link curateVault}); batch ops fuse their
 * sub-calls with Solady `multicall(bytes[])`.
 */
import type { Address, Hex } from "viem";
import { type OnchainClients } from "../wallet/engine.js";
/** `IVaultTypes.FeeClaimType` (uint8): the settle/open/end-of-fund fee
 * behaviour. `None` claims nothing, `Soft` claims shares only, `Full` claims
 * shares + assets. */
export declare const FeeClaimType: {
    readonly None: 0;
    readonly Soft: 1;
    readonly Full: 2;
};
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
export interface SettleInput extends Target {
    readonly kind: SettleKind;
    /** `FeeClaimType` for `deposits`/`both` (ignored for `redemptions`). */
    readonly feeClaimType?: FeeClaimType;
    /** `fullClaim` bool for `redemptions` (ignored for the enum paths). */
    readonly fullClaim?: boolean;
    /** The unsafe-settle escape hatch — defaults to `false`. */
    readonly unsafe?: boolean;
    /** Explicit permit2 payload for callers managing their own funding. */
    readonly permit2Data?: Hex;
}
export interface WhitelistBatchInput extends Target {
    /** The addresses to add (`whitelisted: true`) or remove (`false`) in one tx. */
    readonly addresses: readonly Address[];
    readonly whitelisted: boolean;
}
/** Build the `curate.vault` namespace: writes + read-only previews/queue reads. */
export declare function makeVaultActions(clients: OnchainClients): {
    read: import("./shared.js").Reads<{
        curator: (i: {
            vault: Address;
        }) => Promise<`0x${string}`>;
        isOpen: (i: {
            vault: Address;
        }) => Promise<boolean>;
        /** Raw `previewSettleAll` tuple, in positional ABI order. */
        previewSettleAll: (i: {
            vault: Address;
            feeClaimType?: FeeClaimType;
        }) => Promise<readonly unknown[]>;
        previewSettleDeposits: (i: {
            vault: Address;
            feeClaimType?: FeeClaimType;
        }) => Promise<readonly unknown[]>;
        previewSettleRedemptions: (i: {
            vault: Address;
            fullClaim?: boolean;
        }) => Promise<readonly unknown[]>;
        previewOpen: (i: {
            vault: Address;
            feeClaimType?: FeeClaimType;
        }) => Promise<readonly unknown[]>;
        previewEnableEndOfFund: (i: {
            vault: Address;
            feeClaimType?: FeeClaimType;
        }) => Promise<readonly unknown[]>;
        previewCloseFund: (i: {
            vault: Address;
        }) => Promise<bigint>;
        previewClaimFees: (i: {
            vault: Address;
            shares: bigint;
        }) => Promise<bigint>;
        /** Live share balance of one holder — the vault IS the share token. Used
         * to skip batched-mint entries already at their target balance. */
        balanceOf: (i: {
            vault: Address;
            owner: Address;
        }) => Promise<bigint>;
        nextEntryFee: (i: {
            vault: Address;
        }) => Promise<QueuedFee>;
        nextExitFee: (i: {
            vault: Address;
        }) => Promise<QueuedFee>;
        nextPerformanceFee: (i: {
            vault: Address;
        }) => Promise<QueuedFee>;
        nextManagementFee: (i: {
            vault: Address;
        }) => Promise<QueuedManagementFee>;
    }>;
    settle: (input: SettleInput) => Promise<import("../index.js").TransactionResult>;
    setNextManagementFee: (input: Target & {
        wad: bigint;
        days: number;
    }) => Promise<import("../index.js").TransactionResult>;
    setNextPerformanceFee: (input: Target & {
        wad: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    setNextEntryFee: (input: Target & {
        wad: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    setNextExitFee: (input: Target & {
        wad: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    claimFees: (input: Target & {
        shares: bigint;
        unsafe?: boolean;
        minAssetsOut?: bigint;
        permit2Data?: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    updateAccruedFees: (input: Target) => Promise<import("../index.js").TransactionResult>;
    updateSharesBatched: (input: Target & {
        receivers: readonly Address[];
        values: readonly bigint[];
    }) => Promise<import("../index.js").TransactionResult>;
    setDepositEnabled: (input: Target & {
        enabled: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    setTransferEnabled: (input: Target & {
        enabled: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    pause: (input: Target) => Promise<import("../index.js").TransactionResult>;
    unpause: (input: Target) => Promise<import("../index.js").TransactionResult>;
    open: (input: Target & {
        feeClaimType?: FeeClaimType;
        unsafe?: boolean;
        permit2Data?: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    close: (input: Target & {
        unsafe?: boolean;
        minAssetsOut?: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    enableEndOfFund: (input: Target & {
        feeClaimType?: FeeClaimType;
        unsafe?: boolean;
        permit2Data?: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    disableEndOfFund: (input: Target & {
        unsafe?: boolean;
        closeVault?: boolean;
        minAssetsOut?: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    setDepositWhitelistEnabled: (input: Target & {
        enabled: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    setWithdrawWhitelistEnabled: (input: Target & {
        enabled: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    applyDepositWhitelist: (input: WhitelistBatchInput) => Promise<import("../index.js").TransactionResult>;
    applyWithdrawWhitelist: (input: WhitelistBatchInput) => Promise<import("../index.js").TransactionResult>;
    setShareNameAndSymbol: (input: Target & {
        name: string;
        symbol: string;
    }) => Promise<import("../index.js").TransactionResult>;
    setIpfsHash: (input: Target & {
        hash: string;
    }) => Promise<import("../index.js").TransactionResult>;
    setCurator: (input: Target & {
        curator: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    setFeeRecipient: (input: Target & {
        feeRecipient: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    setOracle: (input: Target & {
        oracle: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    setT3treasury: (input: Target & {
        treasury: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    setSyncSilo: (input: Target & {
        silo: Address;
        unsafeOut?: boolean;
        unsafeIn?: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    setDepositSilo: (input: Target & {
        silo: Address;
        unsafeOut?: boolean;
        unsafeIn?: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    setRedeemSilo: (input: Target & {
        silo: Address;
        unsafeOut?: boolean;
        unsafeIn?: boolean;
    }) => Promise<import("../index.js").TransactionResult>;
    claimSilosPnl: (input: Target & {
        sync?: boolean;
        deposit?: boolean;
        unsafe?: boolean;
        redeemRequestId?: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    sweep: (input: Target & {
        token: Address;
    }) => Promise<import("../index.js").TransactionResult>;
};
