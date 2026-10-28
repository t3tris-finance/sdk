/**
 * Factory deploy surface for the wallet engine: encode `deployVault`, preview
 * a CREATE3 address, and build the `requireChain → tx` step list. Selectors
 * match `packages/indexer/abis/T3tris.json`.
 */
import { concatHex, encodeAbiParameters, maxUint128, zeroAddress, } from "viem";
import { readCall } from "./engine.js";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
/** Unbounded upward SafeOracle deviation: `2^128 - 1` (`maxUint128`). */
export const SAFE_ORACLE_DEVIATION_UP = maxUint128;
/** 100% down (`1e18` wad). A move of this size can price the oracle at zero. */
export const SAFE_ORACLE_DEVIATION_DOWN = 10n ** 18n;
export const factory = {
    deployVault: {
        sel: "0xa5d37df5",
    },
    previewVaultAddress: {
        sel: "0x76eae34c",
        in: [{ type: "address" }, { type: "bytes32" }],
        out: [{ type: "address" }],
    },
};
const GLOBAL_FEES = {
    type: "tuple",
    components: [
        { type: "uint64" },
        { type: "uint64" },
        { type: "uint64" },
        { type: "uint64" },
        { type: "uint32" },
    ],
};
const VAULT_PARAMS = {
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
const SAFE_ORACLE = {
    type: "tuple",
    components: [{ type: "address" }, { type: "uint128" }, { type: "uint64" }],
};
function paramsTuple(p) {
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
export function encodeDeployVault(args) {
    return concatHex([
        factory.deployVault.sel,
        encodeAbiParameters([VAULT_PARAMS, SAFE_ORACLE, { type: "address" }, { type: "bytes32" }, { type: "bytes32" }], [
            paramsTuple(args.params),
            [
                args.safeOracle.owner,
                args.safeOracle.maxDeviationUpWad,
                args.safeOracle.maxDeviationDownWad,
            ],
            args.oracle,
            args.salt,
            args.referralCode ?? ZERO_BYTES32,
        ]),
    ]);
}
export async function previewVaultAddress(publicClient, args) {
    const [address] = await readCall(factory.previewVaultAddress, publicClient, {
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
export function defaultSafeOracle(owner, bounds) {
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
