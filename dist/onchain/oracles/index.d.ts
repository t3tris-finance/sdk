/**
 * SafeOracle actions and reads: NAV push
 * (`setTotalAssets`), the up/down price-per-share deviation bounds, the OZ
 * `AccessControlDefaultAdminRules` 2-step admin transfer, and the role
 * grant/revoke/renounce trio.
 *
 * NOTE: the call-table op names are `setMaxDeviationUp` / `setMaxDeviationDown`
 * (the on-chain `setMaxPricePerShareDeviation{Up,Down}Wad`).
 */
import type { Address, Hex } from "viem";
import { type OnchainClients } from "../transport/engine.js";
export interface Target {
    readonly oracle: Address;
    readonly chainId: number;
}
/** Build the `curate.oracle` namespace: writes + reads. */
export declare function makeOracleActions(clients: OnchainClients): {
    read: import("../transport/bindings.js").Reads<{
        totalAssets: (i: {
            oracle: Address;
        }) => Promise<bigint>;
        maxDeviationUp: (i: {
            oracle: Address;
        }) => Promise<bigint>;
        maxDeviationDown: (i: {
            oracle: Address;
        }) => Promise<bigint>;
        admin: (i: {
            oracle: Address;
        }) => Promise<`0x${string}`>;
        defaultAdminDelay: (i: {
            oracle: Address;
        }) => Promise<bigint>;
        pendingAdmin: (i: {
            oracle: Address;
        }) => Promise<{
            pending: `0x${string}`;
            delay: number;
        }>;
        owner: (i: {
            oracle: Address;
        }) => Promise<`0x${string}`>;
        has: (i: {
            oracle: Address;
            role: Hex;
            account: Address;
        }) => Promise<boolean>;
        /** Last PPS saved by a valuation — the deviation-check anchor (0 before the first). */
        lastSavedPps: (i: {
            oracle: Address;
        }) => Promise<bigint>;
    }>;
    setTotalAssets: (input: Target & {
        totalAssets: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    setMaxPricePerShareDeviationUpWad: (input: Target & {
        wad: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    setMaxPricePerShareDeviationDownWad: (input: Target & {
        wad: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
    beginDefaultAdminTransfer: (input: Target & {
        newAdmin: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    acceptDefaultAdminTransfer: (input: Target) => Promise<import("../index.js").TransactionResult>;
    cancelDefaultAdminTransfer: (input: Target) => Promise<import("../index.js").TransactionResult>;
    changeDefaultAdminDelay: (input: Target & {
        newDelay: number;
    }) => Promise<import("../index.js").TransactionResult>;
    rollbackDefaultAdminDelay: (input: Target) => Promise<import("../index.js").TransactionResult>;
    grant: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    revoke: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    renounce: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    applyRoles: (input: Target & {
        calls: readonly {
            op: "grant" | "revoke";
            role: Hex;
            account: Address;
        }[];
    }) => Promise<import("../index.js").TransactionResult>;
};
