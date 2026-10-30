/**
 * Vault deployment inputs, factory calldata and CREATE3 address prediction.
 */

import {
  type AbiParameter,
  type Address,
  concatHex,
  encodeAbiParameters,
  type Hex,
  maxUint128,
  zeroAddress,
} from "viem";
import { type PublicClientSource, readCall } from "../transport/engine";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

/** Unbounded upward SafeOracle deviation: `2^128 - 1` (`maxUint128`). */
export const SAFE_ORACLE_DEVIATION_UP = maxUint128;
/** 100% down (`1e18` wad). A move of this size can price the oracle at zero. */
export const SAFE_ORACLE_DEVIATION_DOWN = 10n ** 18n;

export const factory = {
  deployVault: {
    sel: "0xa5d37df5" as Hex,
  },
  previewVaultAddress: {
    sel: "0x76eae34c" as Hex,
    in: [{ type: "address" }, { type: "bytes32" }] as const,
    out: [{ type: "address" }] as const,
  },
} as const;

const GLOBAL_FEES: AbiParameter = {
  type: "tuple",
  components: [
    { type: "uint64" },
    { type: "uint64" },
    { type: "uint64" },
    { type: "uint64" },
    { type: "uint32" },
  ],
};

const VAULT_PARAMS: AbiParameter = {
  type: "tuple",
  components: [
    { type: "string" },
    { type: "string" },
    { type: "string" },
    GLOBAL_FEES,
    { type: "address" },
    { type: "address" },
    { type: "address" },
    { type: "address" },
    { type: "address" },
    { type: "bool" },
    { type: "bool" },
    { type: "bool" },
    { type: "bool" },
    { type: "bool" },
  ],
};

const SAFE_ORACLE: AbiParameter = {
  type: "tuple",
  components: [{ type: "address" }, { type: "uint128" }, { type: "uint64" }],
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
  vaultOpened: boolean;
}

export interface SafeOracleParams {
  owner: Address;
  maxDeviationUpWad: bigint;
  maxDeviationDownWad: bigint;
}

export interface DeployVaultArgs {
  factory: Address;
  chainId: number;
  params: VaultDeployParams;
  safeOracle: SafeOracleParams;
  oracle: Address;
  salt: Hex;
  referralCode?: Hex;
}

function paramsTuple(p: VaultDeployParams): readonly unknown[] {
  return [
    p.shareName,
    p.shareSymbol,
    p.ipfsHash,
    [
      p.globalFees.entryFeeWad,
      p.globalFees.exitFeeWad,
      p.globalFees.managementFeeWad,
      p.globalFees.performanceFeeWad,
      p.globalFees.managementFeeDays,
    ],
    p.underlyingAsset,
    p.oracle,
    p.vaultOwner,
    p.curator,
    p.feeRecipient,
    p.transferEnabled,
    p.depositEnabled,
    p.depositWhitelistEnabled,
    p.withdrawWhitelistEnabled,
    p.vaultOpened,
  ];
}

/** `deployVault(params, safeOracle, oracle, salt, referralCode)` calldata. */
export function encodeDeployVault(args: Omit<DeployVaultArgs, "factory" | "chainId">): Hex {
  return concatHex([
    factory.deployVault.sel,
    encodeAbiParameters(
      [VAULT_PARAMS, SAFE_ORACLE, { type: "address" }, { type: "bytes32" }, { type: "bytes32" }],
      [
        paramsTuple(args.params),
        [
          args.safeOracle.owner,
          args.safeOracle.maxDeviationUpWad,
          args.safeOracle.maxDeviationDownWad,
        ],
        args.oracle,
        args.salt,
        args.referralCode ?? ZERO_BYTES32,
      ],
    ),
  ]);
}

export async function previewVaultAddress(
  publicClient: PublicClientSource,
  args: { factory: Address; deployer: Address; salt: Hex },
): Promise<Address> {
  const [address] = await readCall<[Address]>(factory.previewVaultAddress, publicClient, {
    address: args.factory,
    args: [args.deployer, args.salt],
  });
  return address;
}

/**
 * SafeOracle params for a fresh clone. These defaults are not a tight oracle:
 * upward deviation is unbounded (`2^128 - 1`) and downward deviation is 100%
 * down (`1e18`). Pass `bounds` to override either field. Omitted fields keep
 * these defaults, so existing deploy transactions do not change.
 */
export function defaultSafeOracle(
  owner: Address,
  bounds?: {
    maxDeviationUpWad?: bigint;
    maxDeviationDownWad?: bigint;
  },
): SafeOracleParams {
  return {
    owner,
    maxDeviationUpWad: bounds?.maxDeviationUpWad ?? SAFE_ORACLE_DEVIATION_UP,
    maxDeviationDownWad: bounds?.maxDeviationDownWad ?? SAFE_ORACLE_DEVIATION_DOWN,
  };
}

/**
 * The clone sentinel is the zero address (`address(0)`), not a deployed clone
 * address. Passing it as the factory `oracle` argument tells the factory to
 * clone a fresh SafeOracle.
 */
export const factoryOracleClone = zeroAddress;
