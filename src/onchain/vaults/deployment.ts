/**
 * Vault deployment inputs, factory calldata and CREATE3 address prediction.
 */

import {
  type AbiParameter,
  type Address,
  concatHex,
  encodeAbiParameters,
  type Hex,
  isAddress,
  maxUint128,
  zeroAddress,
} from "viem";
import { type PublicClientSource, readCall } from "../transport/engine";

/** Canonical CREATE3-deployed protocol proxy, shared across supported chains. */
export const T3TRIS_FACTORY_ADDRESS: Address = "0x0000000000CC53b5Fd649b80f08b05405779cC71";

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

function paramsTuple(p: Omit<DeployVaultArgs, "chainId">, oracle: Address): readonly unknown[] {
  return [
    p.name,
    p.symbol,
    p.config.ipfsHash ?? "",
    [p.fees.entry, p.fees.exit, p.fees.management, p.fees.performance, p.fees.managementDays],
    p.asset,
    oracle,
    p.owner,
    p.curator,
    p.feeRecipient,
    p.config.transferEnabled,
    p.config.depositEnabled,
    p.config.depositWhitelistEnabled,
    p.config.withdrawWhitelistEnabled,
    false, // SDK 0.6 creates asynchronous vaults regardless of extra runtime fields.
  ];
}

/** `deployVault(params, safeOracle, oracle, salt, referralCode)` calldata. */
export function encodeDeployVault(args: Omit<DeployVaultArgs, "chainId">): Hex {
  const oracle = args.oracle;
  if (!oracle || typeof oracle !== "object")
    throw new TypeError("oracle must select a SafeOracle or an existing address");
  const isSafe = "safe" in oracle;
  if (isSafe) {
    if (oracle.safe !== true || "address" in oracle)
      throw new TypeError("oracle variants are mutually exclusive");
    if (!isAddress(oracle.owner) || oracle.owner.toLowerCase() === zeroAddress)
      throw new TypeError("SafeOracle owner must be a nonzero address");
    for (const [name, value, maximum] of [
      ["maxDeviationUp", oracle.maxDeviationUp ?? SAFE_ORACLE_DEVIATION_UP, maxUint128],
      ["maxDeviationDown", oracle.maxDeviationDown ?? SAFE_ORACLE_DEVIATION_DOWN, (1n << 64n) - 1n],
    ] as const) {
      if (typeof value !== "bigint" || value < 0n || value > maximum)
        throw new RangeError(`oracle.${name} is outside the contract range`);
    }
  } else if (
    !isAddress(oracle.address) ||
    oracle.address.toLowerCase() === zeroAddress ||
    ["owner", "maxDeviationUp", "maxDeviationDown"].some((key) => key in oracle)
  ) {
    throw new TypeError("existing oracle requires only a nonzero address");
  }
  const oracleAddress = isSafe ? zeroAddress : oracle.address;
  const safeTuple = isSafe
    ? [
        oracle.owner,
        oracle.maxDeviationUp ?? SAFE_ORACLE_DEVIATION_UP,
        oracle.maxDeviationDown ?? SAFE_ORACLE_DEVIATION_DOWN,
      ]
    : [zeroAddress, 0n, 0n];
  return concatHex([
    factory.deployVault.sel,
    encodeAbiParameters(
      [VAULT_PARAMS, SAFE_ORACLE, { type: "address" }, { type: "bytes32" }, { type: "bytes32" }],
      [
        paramsTuple(args, oracleAddress),
        safeTuple,
        oracleAddress,
        args.deployment.salt,
        args.deployment.referralCode ?? ZERO_BYTES32,
      ],
    ),
  ]);
}

export async function previewVaultAddress(
  publicClient: PublicClientSource,
  args: { deployer: Address; salt: Hex },
): Promise<Address> {
  const [address] = await readCall<[Address]>(factory.previewVaultAddress, publicClient, {
    address: T3TRIS_FACTORY_ADDRESS,
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
    maxDeviationUp?: bigint;
    maxDeviationDown?: bigint;
  },
): SafeOracleConfig {
  return {
    safe: true,
    owner,
    maxDeviationUp: bounds?.maxDeviationUp ?? SAFE_ORACLE_DEVIATION_UP,
    maxDeviationDown: bounds?.maxDeviationDown ?? SAFE_ORACLE_DEVIATION_DOWN,
  };
}
