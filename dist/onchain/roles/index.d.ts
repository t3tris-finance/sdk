/**
 * Vault AccessControlEnumerable actions and membership reads. Single
 * grants / revokes / renounces plus a `grantAll` that fuses many `grantRole`
 * sub-calls into one Solady `multicall(bytes[])`, and the 2-step admin handover
 * (`initGrantAdmin` → `acceptAdmin`, or cancel / applyAdminBurn).
 *
 * Role ids are keccak256(name). Use roleId for a role's canonical name.
 */
import { type Address, type Hex } from "viem";
import { type OnchainClients } from "../transport/engine.js";
/** The bytes32 role id for a role name: `keccak256(utf8Bytes(name))`. Matches
 * OpenZeppelin's `keccak256("SOME_ROLE")` id derivation. */
export declare const roleId: (name: string) => Hex;
/** bytes32(0) — the OZ default admin id, which is also the vault super-admin. */
export declare const ZERO_ROLE: Hex;
/** Vault lifecycle roles (pause is dual-role: one to pause, one to unpause). */
export declare const VAULT_PAUSE_ROLE: Hex;
export declare const VAULT_UNPAUSE_ROLE: Hex;
export declare const VAULT_ENABLE_DEPOSIT_ROLE: Hex;
export declare const VAULT_ENABLE_TRANSFER_ROLE: Hex;
export declare const VAULT_ENABLE_END_OF_FUND_ROLE: Hex;
export declare const VAULT_DISABLE_END_OF_FUND_ROLE: Hex;
export declare const VAULT_OPEN_ROLE: Hex;
export declare const VAULT_CLOSE_ROLE: Hex;
/** Protocol governance super-admin — Open/Close vault is this seat only. */
export declare const VAULT_GOVERNANCE_ADMIN_ROLE: Hex;
/** The vault-scoped operating leaves (settlement / fees / access / operator /
 * metadata) — the granular-picker catalogue. */
export declare const VAULT_SETTLE_ROLE: Hex;
export declare const VAULT_SETTLE_DEPOSITS_ROLE: Hex;
export declare const VAULT_SETTLE_REDEMPTIONS_ROLE: Hex;
export declare const VAULT_CLAIM_FEES_ROLE: Hex;
export declare const VAULT_UPDATE_ACCRUED_FEES_ROLE: Hex;
export declare const VAULT_UPDATE_ENTRY_FEE_WAD_ROLE: Hex;
export declare const VAULT_UPDATE_EXIT_FEE_WAD_ROLE: Hex;
export declare const VAULT_UPDATE_MGMT_FEE_WAD_ROLE: Hex;
export declare const VAULT_UPDATE_PERFORMANCE_FEE_WAD_ROLE: Hex;
export declare const VAULT_ENABLE_WHITELIST_ROLE: Hex;
export declare const VAULT_SET_WHITELISTED_ROLE: Hex;
export declare const VAULT_UPDATE_CURATOR_ROLE: Hex;
export declare const VAULT_UPDATE_FEE_RECIPIENT_ROLE: Hex;
export declare const VAULT_UPDATE_ORACLE_ROLE: Hex;
export declare const VAULT_UPDATE_SHARES_ROLE: Hex;
export declare const VAULT_SET_SHARE_NAME_SYMBOL_ROLE: Hex;
export declare const VAULT_UPGRADE_VAULT_ROLE: Hex;
/** Governance-administered vault roles. SET_IPFS_HASH_ROLE is administered
 * by the vault super-admin instead. */
export declare const VAULT_UPDATE_T3TREASURY_ROLE: Hex;
export declare const VAULT_SWEEP_ROLE: Hex;
export declare const VAULT_CLAIM_SILO_PNL_ROLE: Hex;
export declare const VAULT_FORCE_CLAIM_DEPOSIT_ROLE: Hex;
export declare const VAULT_RECOVERY_ROLE: Hex;
export declare const VAULT_SET_IPFS_HASH_ROLE: Hex;
export declare const VAULT_UPDATE_SYNC_SILO_ROLE: Hex;
export declare const VAULT_UPDATE_NEW_REDEEM_SILO_ROLE: Hex;
export declare const VAULT_UPDATE_NEW_DEPOSIT_SILO_ROLE: Hex;
/** T3tris PROTOCOL contract roles (T3tris.sol, not the vault). Deployment,
 * defaults, global pause and upgrades — inspection only from a vault. */
export declare const T3TRIS_DEPLOY_VAULT_WITH_EXTRA_PARAMS_ROLE: Hex;
export declare const T3TRIS_DEPLOY_SILO_WITH_CUSTOM_STRATEGY_ROLE: Hex;
export declare const T3TRIS_ADD_VAULT_IMPLEMENTATION_ROLE: Hex;
export declare const T3TRIS_SET_VERSION_WHITELIST_ROLE: Hex;
export declare const T3TRIS_SET_DEFAULT_STRATEGY_GENERATOR_ROLE: Hex;
export declare const T3TRIS_SET_T3TREASURY_ROLE: Hex;
export declare const T3TRIS_SET_DEFAULT_SILO_ROLE: Hex;
export declare const T3TRIS_SET_DEFAULT_GOVERNANCE_OWNER_ROLE: Hex;
export declare const T3TRIS_PAUSE_PROTOCOL_ROLE: Hex;
export declare const T3TRIS_UNPAUSE_PROTOCOL_ROLE: Hex;
export declare const T3TRIS_PAUSE_VAULTS_ROLE: Hex;
export declare const T3TRIS_UNPAUSE_VAULTS_ROLE: Hex;
export declare const T3TRIS_UPGRADE_ROLE: Hex;
/** SafeOracle roles (the oracle has its OWN AccessControl, not the vault's). */
export declare const ORACLE_SET_TOTAL_ASSETS_ROLE: Hex;
export declare const ORACLE_ADMIN_SET_TOTAL_ASSETS_ROLE: Hex;
export declare const ORACLE_SET_MAX_PPS_DEVIATION_UP_ROLE: Hex;
export declare const ORACLE_ADMIN_SET_MAX_PPS_DEVIATION_UP_ROLE: Hex;
export declare const ORACLE_SET_MAX_PPS_DEVIATION_DOWN_ROLE: Hex;
export declare const ORACLE_ADMIN_SET_MAX_PPS_DEVIATION_DOWN_ROLE: Hex;
export interface Target {
    readonly address: Address;
    readonly chainId: number;
}
/** Build the `curate.roles` namespace: writes + membership reads. */
export declare function makeRoleActions(clients: OnchainClients): {
    read: import("../transport/bindings.js").Reads<{
        has: (i: {
            address: Address;
            role: Hex;
            account: Address;
        }) => Promise<boolean>;
        adminOf: (i: {
            address: Address;
            role: Hex;
        }) => Promise<`0x${string}`>;
        memberCount: (i: {
            address: Address;
            role: Hex;
        }) => Promise<bigint>;
        members: (i: {
            address: Address;
            role: Hex;
        }) => Promise<readonly `0x${string}`[]>;
        defaultAdminRole: (i: {
            address: Address;
        }) => Promise<`0x${string}`>;
        nextDefaultAdminRecipient: (i: {
            address: Address;
        }) => Promise<`0x${string}`>;
        nextGovernanceAdminRecipient: (i: {
            address: Address;
        }) => Promise<`0x${string}`>;
    }>;
    grant: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    revoke: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    renounceRole: (input: Target & {
        role: Hex;
        account: Address;
    }) => Promise<import("../index.js").TransactionResult>;
    grantAll: (input: Target & {
        account: Address;
        roles: readonly Hex[];
    }) => Promise<import("../index.js").TransactionResult>;
    grantBatch: (input: Target & {
        calls: readonly {
            role: Hex;
            account: Address;
        }[];
    }) => Promise<import("../index.js").TransactionResult>;
    revokeBatch: (input: Target & {
        calls: readonly {
            role: Hex;
            account: Address;
        }[];
    }) => Promise<import("../index.js").TransactionResult>;
    initGrantAdminRole: (input: Target & {
        account: Address;
        role: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    acceptAdminRole: (input: Target & {
        role: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    cancelGrantAdminRole: (input: Target & {
        role: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
    applyAdminBurn: (input: Target & {
        role: Hex;
    }) => Promise<import("../index.js").TransactionResult>;
};
