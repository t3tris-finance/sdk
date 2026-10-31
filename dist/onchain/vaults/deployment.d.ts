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
export interface GlobalFeesParams {
    entryFeeWad: bigint;
    exitFeeWad: bigint;
    managementFeeWad: bigint;
    performanceFeeWad: bigint;
    managementFeeDays: number;
}
export interface VaultDeployParams {
    shareName: string;
    shareSymbol: string;
    ipfsHash: string;
    globalFees: GlobalFeesParams;
    underlyingAsset: Address;
    oracle: Address;
    vaultOwner: Address;
    curator: Address;
    feeRecipient: Address;
    transferEnabled: boolean;
    depositEnabled: boolean;
    depositWhitelistEnabled: boolean;
    withdrawWhitelistEnabled: boolean;
}
export interface SafeOracleParams {
    owner: Address;
    maxDeviationUpWad: bigint;
    maxDeviationDownWad: bigint;
}
export interface DeployVaultArgs {
    chainId: number;
    params: VaultDeployParams;
    safeOracle: SafeOracleParams;
    oracle: Address;
    salt: Hex;
    referralCode?: Hex;
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
    maxDeviationUpWad?: bigint;
    maxDeviationDownWad?: bigint;
}): SafeOracleParams;
/**
 * The clone sentinel is the zero address (`address(0)`), not a deployed clone
 * address. Passing it as the factory `oracle` argument tells the factory to
 * clone a fresh SafeOracle.
 */
export declare const factoryOracleClone: "0x0000000000000000000000000000000000000000";
