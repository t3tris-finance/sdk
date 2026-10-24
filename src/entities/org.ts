import type { ApiScope } from "./auth";
import type { Address, VaultRef } from "./primitives";

export interface Organization {
  id: string;
  /** Opaque public handle (uuid) — URLs use this instead of the slug. */
  uuid: string;
  name: string;
  slug: string;
  createdAt: number; // unix s
}

export type OrgRole = "owner" | "admin" | "member";

export interface Membership {
  orgId: string;
  accountId: string;
  role: OrgRole;
}

/** A member of an org, with the account handle resolved (one of address/email). */
export interface OrgMember {
  accountId: string;
  role: OrgRole;
  addedAt: number; // unix s
  address?: Address;
  email?: string;
}

/** Pending seat. Accepted on first sign-in matching `email` or `address`. */
export interface OrgInvite {
  id: string;
  role: OrgRole;
  invitedAt: number; // unix s
  expiresAt: number; // unix s
  address?: Address;
  email?: string;
}

export type AddOrgMemberResult =
  | { kind: "member"; member: OrgMember }
  | { kind: "invite"; invite: OrgInvite };

/** An api key as listings see it — the token hash is never derivable from
 * this; the full token exists only in the createOrgKey response, once. */
export interface ApiKeyMasked {
  id: string;
  name: string;
  tokenPrefix: string; // e.g. "sk_live_a1b2" — env tag + first 4 random hex
  scopes: ApiScope[];
  unlimited: boolean;
  /** Per-key monthly request cap. Omitted = org quota only. */
  monthlyQuota?: number;
  /** Requests in the current org usage cycle (same window as quota reset). */
  requestsUsed: number;
  vaults: VaultRef[];
  createdAt: number; // unix s
  lastUsedAt?: number;
  revokedAt?: number;
}

/** Listing hint: the first 4 random hex chars after `sk_live_` / `sk_dev_`. */
export function apiKeyHint(tokenPrefix: string): string {
  const match = /^sk_(?:live|dev)_([0-9a-fA-F]{4})/.exec(tokenPrefix);
  return match?.[1] === undefined ? "—" : `${match[1]}…`;
}

/** The one-time answer to createOrgKey: the plaintext token is NOT stored
 * server-side (only its sha256) — lose it, mint a new key. */
export interface OrgKeyCreated {
  key: ApiKeyMasked;
  token: string;
}

/** Sum of all persisted daily/endpoint counters for one org key. */
export interface OrgUsageEndpoint {
  endpoint: string;
  count: number;
}

export interface OrgUsageKeyTotal {
  apiKeyId: string;
  name: string;
  tokenPrefix: string;
  count: number;
  endpoints: OrgUsageEndpoint[];
}

export interface OrgUsageDay {
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  count: number;
}

/** One org-level hourly counter. A daily row cannot be split back into hours,
 * so the Overview 24h/7d charts read these real buckets. */
export interface OrgUsageHour {
  /** Unix seconds, floored to the hour. */
  ts: number;
  count: number;
}

export interface OrgUsage {
  orgId: string;
  keys: OrgUsageKeyTotal[]; // highest total first
  days: OrgUsageDay[];
  hours: OrgUsageHour[]; // oldest first
}

/** One side of the request meter within the current org usage cycle. `quota`
 * is the configured cap and `remaining` is `quota − used` (never negative);
 * both are null when uncapped — a key without a monthly quota, an org without
 * an active subscription quota. */
export interface UsageQuota {
  used: number;
  quota: number | null;
  remaining: number | null;
}

/** The calling key's usage view (GET /v1/key/usage): the key's own counters
 * plus the org cycle they draw from. Both sides share the one cycle window a
 * paid quota reset restarts. */
export interface UsageSummary {
  key: UsageQuota;
  org: UsageQuota;
}

/** One account's vault pin (legacy `publicFavorite`). `pinned=true` is a
 * favorite; `pinned=false` the negative pin (archived — overrides the
 * funded/verified default verdict); no row = the client's default verdict. */
export interface AccountFavorite {
  chainId: number;
  vault: Address;
  pinned: boolean;
  createdAt: string; // ISO
}

/** Wire envelope for the account-favorites endpoints. The endpoint returns an
 * object (not a bare array) so future account-scoped cursor/meta fields can be
 * added without changing the root response shape. */
export interface AccountFavorites {
  favorites: AccountFavorite[];
}

export type SubscriptionPlan = "starter" | "custom";
export type SubscriptionStatus = "active" | "canceled" | "not_subscribed";
export type PaymentStatus = "pending" | "confirmed";
export type PaymentKind = "subscription" | "quota_reset" | "credit_purchase";

/** 1 USD cent = 10_000 native-USDC units (6 decimals).
 * Convert a live quote from `client.billing.getPricing()` — there is no
 * client-side price. */
export const usdcUnitsFromCents = (cents: number): bigint => BigInt(cents) * 10_000n;

/** Pay-as-you-go credit purchase bounds. Credits are prepaid in whole cents, so
 * a purchase can never be a rounding-away trickle or an unbounded transfer. */
export const CREDIT_PURCHASE_MIN_CENTS = 1_000; // $10
export const CREDIT_PURCHASE_MAX_CENTS = 1_000_000; // $10,000

/** Hard ceilings the platform will ever configure, independent of the Starter
 * defaults. Request quotas exceed int4 (2,147,483,647), so the columns holding
 * them are bigint. The platform enforces these numbers. */
export const LIMIT_CEILINGS = {
  vaults: 100_000,
  requestsPerMonth: 10_000_000_000,
} as const;

export interface Subscription {
  orgId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  monthlyPriceCents: number;
  capacity: {
    vaults: number;
    callsPerMonth: number;
  };
  /** Current request count, reset at the start of each active billing cycle. */
  requestsUsed: number;
  usageStartedAt?: number;
  renewsAt?: number; // unix s — active subscription period end
  /** True when the org scheduled cancellation. Access continues until
   *  `renewsAt`; only an operator cancel ends the plan immediately. */
  cancelAtPeriodEnd?: boolean;
  /** A configured offer may expire independently of the active period. */
  offerExpiresAt?: number;
  /** Pay-as-you-go overage. With `enabled` false the request quota is a hard
   *  stop; with it true, requests past the quota draw on the prepaid credit
   *  balance at the operator's per-request price. */
  extraUsage: ExtraUsage;
}

export interface ExtraUsage {
  enabled: boolean;
  /** Prepaid credits remaining, integer cents. */
  creditBalanceCents: number;
  /** Operator price for over-quota traffic, cents per 1M requests. */
  pricePerMillionRequestsCents: number;
  /** Requests past the included quota in the current cycle. */
  overageRequests: number;
  /** Cost of `overageRequests` already debited from the balance. */
  chargedOverageCents: number;
}

/** The org's extra-usage credit movements, newest first. */
export interface CreditLedgerEntry {
  id: string;
  orgId: string;
  kind: "purchase" | "consumption" | "adjustment";
  /** Signed cents: positive funds the balance, negative consumes it. */
  amountCents: number;
  balanceAfterCents: number;
  requestCount: number;
  txHash?: string;
  createdBy?: string;
  createdAt: number; // unix s
}

export interface Payment {
  id: string;
  /** Opaque public handle (uuid) — the invoice number in a download URL. */
  uuid: string;
  orgId: string;
  kind: PaymentKind;
  plan: SubscriptionPlan;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  txHash?: string;
  createdAt: number; // unix s
  confirmedAt?: number; // unix s
  periodStart?: number;
  periodEnd?: number;
}

/** Operator-configured prices used for new Starter subscriptions and add-ons. */
export interface BillingPricing {
  currency: string;
  starter: {
    vaults: number;
    requestsPerMonth: number;
    monthlyPriceCents: number;
  };
  extraVaultPriceCents: number;
  extraMillionRequestsPriceCents: number;
  quotaResetPriceCents: number;
  maxVaults: number;
  maxRequestsPerMonth: number;
}
