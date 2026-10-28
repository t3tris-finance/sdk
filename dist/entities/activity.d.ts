import type { Address, Hash } from "./primitives.js";
/** The buckets the Activity feed's Event-types filter exposes. The indexer
 * stores exactly one of these on every activity row (`payload.category`). */
export declare const ACTIVITY_CATEGORIES: readonly ["deposit", "redeem", "valuation", "settlement", "roles", "fees", "config", "transfer"];
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
/** Depositor activity categories: deposit, redeem, valuation, and settlement.
 * Role, fee, config, and transfer events are not included. */
export declare const PUBLIC_ACTIVITY_CATEGORIES: readonly ["deposit", "redeem", "valuation", "settlement"];
/** Protocol-internal accounting that is never depositor or operator activity:
 * silo PnL legs, protocol pause switches, and silo strategy plumbing.
 * Hidden from every activity feed server-side, so pagination never spends a
 * page slot on them. */
export declare const HIDDEN_ACTIVITY_KINDS: readonly ["silo.deposit.pnl", "silo.redeem.pnl", "silo.sync.pnl", "silo.t3tris.profit", "T3tris.Paused", "T3tris.Unpaused", "protocol.vaults.paused", "protocol.vaults.unpaused", "silo.paused", "silo.unpaused", "silo.strategySet"];
/** One protocol event; payload is opaque here and typed per kind at the call sites. */
interface ActivityEvent {
    id: string;
    chainId: number;
    vaultAddress: Address;
    kind: string;
    ts: number;
    block: number;
    txHash: Hash;
    actorAddress?: Address;
    /** Kind-specific fields. `category` (an {@link ActivityCategory}) rides here
     * for every row; `amount`/`prev`/`next`/`account` etc. vary by kind. */
    payload: Record<string, unknown>;
}
export type { ActivityEvent };
