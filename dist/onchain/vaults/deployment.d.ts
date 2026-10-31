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
    /** Fee rates are bigint WAD: 10^16 = 1%. */
    entry: bigint;
    exit: bigint;
    performance: bigint;
    management: bigint;
    managementDays: number;
}
export interface VaultConfig {
    ipfsHash: string;
    transferEnabled: boolean;
    depositEnabled: boolean;
    depositWhitelistEnabled: boolean;
    withdrawWhitelistEnabled: boolean;
}
export interface SafeOracleConfig {
    safe: true;
    owner: Address;
    /** Deviation bounds are bigint WAD: 10^16 = 1%. */
    maxDeviationUp?: bigint;
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
        salt: Hex;
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
