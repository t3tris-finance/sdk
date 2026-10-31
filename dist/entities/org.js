/** Listing hint: the first 4 random hex chars after `sk_live_` / `sk_dev_`. */
export function apiKeyHint(tokenPrefix) {
    const match = /^sk_(?:live|dev)_([0-9a-fA-F]{4})/.exec(tokenPrefix);
    return match?.[1] === undefined ? "—" : `${match[1]}…`;
}
/** 1 USD cent = 10_000 native-USDC units (6 decimals).
 * Convert a live quote from `client.billing.getPricing()` — there is no
 * client-side price. */
export const usdcUnitsFromCents = (cents) => BigInt(cents) * 10000n;
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
};
