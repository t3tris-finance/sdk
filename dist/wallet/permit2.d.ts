/**
 * Uniswap Permit2 funding path for the vault's `bytes permit2Data` arg — the
 * vault decodes `(PermitSingle, signature)`, replays
 * `permit2.permit(from, permitSingle, sig)` then
 * `permit2.transferFrom(from, vault, amount, token)`. Needs, once:
 * `approve(asset, PERMIT2, max)`, then a fresh `PermitSingle` signature whose
 * window derives from CHAIN time (never `Date.now()`). Clean port of the
 * legacy `earn/permit2.ts`.
 */
import { type Address, type Hex, type TypedData, type TypedDataDomain } from "viem";
import { type PublicClientSource } from "./engine.js";
/** Canonical Permit2 deployment — identical address on every chain. */
export declare const PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3";
/** 30 days — default validity window for the Permit2 allowance. */
export declare const DEFAULT_PERMIT_EXPIRATION_SECONDS: number;
/** 30 minutes — default deadline for the signature itself. */
export declare const DEFAULT_SIG_DEADLINE_SECONDS: number;
/** `allowance(owner, token, spender)` on Permit2 — the rolling nonce source. */
export declare function readPermit2Allowance(client: Pick<PublicClientSource, "call">, params: {
    owner: Address;
    token: Address;
    spender: Address;
}): Promise<{
    amount: bigint;
    expiration: number;
    nonce: number;
}>;
/** The EIP-712 `PermitSingle` message the vault decodes + replays. */
export interface PermitSingle {
    details: {
        token: Address;
        amount: bigint;
        expiration: number;
        nonce: number;
    };
    spender: Address;
    sigDeadline: bigint;
}
/** The `{ domain, types, primaryType, message }` payload for a PermitSingle. */
export declare function buildPermitSingleTypedData(permit: PermitSingle, chainId: number): {
    domain: TypedDataDomain;
    types: TypedData;
    primaryType: "PermitSingle";
    message: Record<string, unknown>;
};
/** ABI-encode `(PermitSingle, bytes signature)` exactly as the vault's
 *  `abi.decode(permit2Data, (PermitSingle, bytes))` expects. */
export declare function encodePermit2Data(permit: PermitSingle, signature: Hex): Hex;
/** `(expiration, sigDeadline)` from a chain-time unix seconds base. Pure —
 *  the caller owns the clock (chain `block.timestamp`). */
export declare function permitDeadlines(nowSeconds: number): {
    expiration: number;
    sigDeadline: bigint;
};
