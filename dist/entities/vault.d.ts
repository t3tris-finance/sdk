import type { RiskRating } from "./market.js";
import type { Address } from "./primitives.js";
/** Vault fee policy. Bps are the API units (on-chain wads are converted server-side). */
export interface FeePolicy {
    entry: number;
    exit: number;
    management: number;
    managementDays: number;
    performance: number;
}
export type VaultStatus = "open" | "paused" | "closed";
export type VaultVisibility = "public" | "private";
/** Granular on-chain toggles (each is individually settable on-chain). */
export interface VaultFlags {
    transferEnabled: boolean;
    depositEnabled: boolean;
    depositWhitelistEnabled: boolean;
    withdrawWhitelistEnabled: boolean;
}
/** An async/sync ERC-4626 vault: on-chain state + curator content in one entity. */
export interface Vault {
    chainId: number;
    address: Address;
    name: string;
    symbol: string;
    decimals: number;
    kind: "sync" | "async";
    status: VaultStatus;
    endOfFund: boolean;
    /** Underlying redeem path: closed vaults apply the async exit fee. */
    vaultOpen: boolean;
    assetAddress: Address;
    curatorAddress: Address;
    ownerAddress: Address;
    feeRecipientAddress: Address;
    protocolAddress: Address;
    oracleAddress: Address;
    isSafeOracle: boolean;
    silos: {
        sync: Address;
        deposit: Address;
        redeem: Address;
    };
    deployerAddress?: Address;
    fees: FeePolicy;
    version: number;
    salt?: string;
    deployCalldata?: string;
    ipfsHash?: string;
    createdAt: number;
    displayName?: string;
    description?: string;
    curatorName?: string;
    curatorUrl?: string;
    verified: boolean;
    visibility: VaultVisibility;
    showComposition: boolean;
    compositionWallets: Address[];
    category?: string;
    depositDisclaimer?: string;
    depositDisclaimerTrigger: "once" | "every";
    depositDisclaimerUpdatedAt?: number;
    flags: VaultFlags;
    totalAssets: string;
    totalSupply: string;
    grossTvl: string;
    /** Effective gross TVL (asset base units, wad string) — the indexed gross TVL
     * with the settled-but-unvalued deposit/redeem gap applied, so a strategy vault
     * between its first settlement and its first post-settle valuation reads its
     * real value instead of 0. THE display/filter/sort basis for TVL. */
    effectiveTvl: string;
    grossPendingDeposits: string;
    grossClaimableRedeems: string;
    /** Outstanding redeem SHARES summed across positions. The Curate vaults list
     * values this at PPS for its pending-redeems metric — the legacy basis. The
     * on-chain `grossClaimableRedeems` getter carries a stale residual on some
     * vaults, so it is not that metric. Absent on a payload from an older API. */
    pendingRedeemShares?: string;
    unclaimedSharesFee: string;
    /** Fee shares previewed for the next accrual; dilute the holder's current PPS. */
    pendingFeeShares: string;
    /** Sum of indexed FeesClaimed underlying amounts (asset base units). Available on getVault. */
    lifetimeClaimedFees?: string;
    settledUnvaluedAssets: string;
    pricePerShareWad: string;
    /** Current gap-corrected PPS, from the same vault state as pending fee shares. */
    effectivePricePerShareWad: string;
    /** Most recent async-settlement event, when the vault has one. */
    lastSettlementTs?: number;
    /** Total underlying assets at the most recent indexed settlement block. */
    lastSettlementAssets?: string;
    /** Most recent oracle/NAV valuation, when the vault reports one. */
    lastValuationTs?: number;
    /** Annualized return over the sliding trailing 30-day window. */
    apy1d?: number | null;
    apy7d?: number | null;
    apy30d: number | null;
    apy1y?: number | null;
    /** Annualized return across the vault's complete indexed lifetime. */
    apyAllTime: number | null;
    /** Latest external risk rating, null until the ratings poller has one. */
    risk: RiskRating | null;
}
/** Point-in-time vault metrics — the chart/TVL series.
 * Amounts are exact decimal strings (wads). */
export interface VaultSnapshot {
    chainId: number;
    vaultAddress: Address;
    ts: number;
    tier: "log";
    trigger?: string;
    settledDepositsNotInOracle?: string;
    settledRedemptionsNotInOracle?: string;
    block: number;
    pricePerShare: string;
    pricePerShareEffective: string;
    highWaterMark: string;
    totalAssets: string;
    totalSupply: string;
    totalNetAssets: string;
    totalNetSupply: string;
    /** Chart-only continuity across an unfunded creation following imported
     * history. The raw on-chain totalAssets/totalNetAssets remain zero. */
    chartTotalAssets?: string;
    lastSettlementTs: number | null;
    pendingDeposits: string;
    pendingRedemptions: string;
}
/** One resolved role assignment on a vault — the indexer's AccessControl
 * mirror. `role` is the opaque keccak bytes32 id; `roleName` is the display
 * name the indexer resolved from the on-chain constant (e.g. "SETTLE_ROLE").
 * Only assignments the indexer has seen are listed — an account that never
 * held a role has no row. */
export interface VaultRoleAssignment {
    role: string;
    roleName: string;
    account: Address;
    granted: boolean;
    grantedAt?: number;
    revokedAt?: number;
}
export type VaultWhitelistKind = "deposit" | "withdraw";
/** One deposit/withdraw whitelist row (the indexer's whitelist mirror). */
export interface VaultWhitelistEntry {
    kind: VaultWhitelistKind;
    account: Address;
    whitelisted: boolean;
    updatedAt: number;
}
/** One AccessControl `adminOf` edge: `adminRole` administers `role`.
 * An account holding `adminRole` can grant or revoke `role`. */
export interface VaultRoleAdmin {
    role: string;
    roleName: string;
    adminRole: string;
    adminRoleName: string;
}
/** Indexed governance for one vault: role assignments, admin edges, whitelist
 * rows, and the depositor count. Returned by `vaults.getGovernance`
 * (`public` scope). On-chain role changes are sent with `@t3tris/sdk/curate`,
 * not written through this read. */
export interface VaultGovernance {
    roles: VaultRoleAssignment[];
    roleAdmins: VaultRoleAdmin[];
    /** The SafeOracle's OWN AccessControl. The oracle is a separate contract with
     * a separate role graph (`SET_TOTAL_ASSETS`, `SET_MAX_PPS_DEVIATION_*` and
     * their `ADMIN_*` seats), so it is mirrored separately rather than merged into
     * `roles`. Empty for a custom oracle, which has no role graph. */
    oracleRoles: VaultRoleAssignment[];
    oracleRoleAdmins: VaultRoleAdmin[];
    whitelist: VaultWhitelistEntry[];
    /** Accounts the indexer has seen a position row for; null when unknown. */
    depositors: number | null;
}
/** APY measurement windows, mirroring the performance surface (D/W/M/Y/ALL). */
export type ApyWindow = "D" | "W" | "M" | "Y" | "ALL";
/** Per-window annualized yield (0.0532 = +5.32%), or null when the window holds
 * no valuation to measure. */
export type ApyByWindow = Record<ApyWindow, number | null>;
