/**
 * Vault deployment inputs, factory calldata and CREATE3 address prediction.
 */
import { type Address, type Hex } from "viem";
import { type PublicClientSource } from "../transport/engine.js";
/** Canonical CREATE3-deployed protocol proxy, shared across supported chains. */
export declare const T3TRIS_FACTORY_ADDRESS: Address;
/** Unbounded upward SafeOracle deviation: `2^128 - 1` (`maxUint128`). */
export declare const SAFE_ORACLE_DEVIATION_UP: bigint;
/** 100% down (`1e18` wad). A move of this size can price the oracle at zero. */
export declare const SAFE_ORACLE_DEVIATION_DOWN: bigint;
export declare const factory: {
    readonly deployVault: {
        readonly sel: Hex;
    };
    readonly previewVaultAddress: {
        readonly sel: Hex;
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bytes32";
        }];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
};
export interface VaultFees {
    /** Entry fee in bigint WAD: 10^16 = 1%, 0 = no fee. */
    entry: bigint;
    /** Exit fee in bigint WAD: 10^16 = 1%. */
    exit: bigint;
    /** Performance fee in bigint WAD: 10^16 = 1%. */
    performance: bigint;
    /** Management fee in bigint WAD, applied over managementDays. */
    management: bigint;
    /** Management-fee accrual period, in whole days (Curate starts at 365). */
    managementDays: number;
}
export interface VaultConfig {
    /** Optional metadata content hash; defaults to the empty string. */
    ipfsHash?: string;
    /** Allow share transfers. */
    transferEnabled: boolean;
    /** Allow asynchronous deposit requests; does not enable sync mode. */
    depositEnabled: boolean;
    /** Restrict deposits to the deposit whitelist when true. */
    depositWhitelistEnabled: boolean;
    /** Restrict withdrawals to the withdrawal whitelist when true. */
    withdrawWhitelistEnabled: boolean;
}
export interface SafeOracleConfig {
    safe: true;
    owner: Address;
    /** Optional upward WAD bound (10^16 = 1%); defaults to 2^128 − 1. */
    maxDeviationUp?: bigint;
    /** Optional downward WAD bound; defaults to 10^18 (100%). */
    maxDeviationDown?: bigint;
    address?: never;
}
export interface ExistingOracleConfig {
    address: Address;
    safe?: never;
    owner?: never;
    maxDeviationUp?: never;
    maxDeviationDown?: never;
}
export type VaultOracleConfig = SafeOracleConfig | ExistingOracleConfig;
export interface DeployVaultArgs {
    chainId: number;
    name: string;
    symbol: string;
    asset: Address;
    owner: Address;
    curator: Address;
    feeRecipient: Address;
    config: VaultConfig;
    oracle: VaultOracleConfig;
    deployment: {
        /** Unique bytes32 salt used with the deploying account for address prediction. */
        salt: Hex;
        /** Optional bytes32 referral identifier; defaults to zero. */
        referralCode?: Hex;
    };
    fees: VaultFees;
}
/** `deployVault(params, safeOracle, oracle, salt, referralCode)` calldata. */
export declare function encodeDeployVault(args: Omit<DeployVaultArgs, "chainId">): Hex;
export declare function previewVaultAddress(publicClient: PublicClientSource, args: {
    deployer: Address;
    salt: Hex;
}): Promise<Address>;
/**
 * SafeOracle params for a fresh clone. These defaults are not a tight oracle:
 * upward deviation is unbounded (`2^128 - 1`) and downward deviation is 100%
 * down (`1e18`). Pass `bounds` to override either field. Omitted fields keep
 * these defaults, so existing deploy transactions do not change.
 */
export declare function defaultSafeOracle(owner: Address, bounds?: {
    maxDeviationUp?: bigint;
    maxDeviationDown?: bigint;
}): SafeOracleConfig;
