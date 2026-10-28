/** The buckets the Activity feed's Event-types filter exposes. The indexer
 * stores exactly one of these on every activity row (`payload.category`). */
export const ACTIVITY_CATEGORIES = [
    "deposit",
    "redeem",
    "valuation",
    "settlement",
    "roles",
    "fees",
    "config",
    "transfer",
];
/** Depositor activity categories: deposit, redeem, valuation, and settlement.
 * Role, fee, config, and transfer events are not included. */
export const PUBLIC_ACTIVITY_CATEGORIES = [
    "deposit",
    "redeem",
    "valuation",
    "settlement",
];
/** Protocol-internal accounting that is never depositor or operator activity:
 * silo PnL legs, protocol pause switches, and silo strategy plumbing.
 * Hidden from every activity feed server-side, so pagination never spends a
 * page slot on them. */
export const HIDDEN_ACTIVITY_KINDS = [
    "silo.deposit.pnl",
    "silo.redeem.pnl",
    "silo.sync.pnl",
    "silo.t3tris.profit",
    "T3tris.Paused",
    "T3tris.Unpaused",
    "protocol.vaults.paused",
    "protocol.vaults.unpaused",
    "silo.paused",
    "silo.unpaused",
    "silo.strategySet",
];
