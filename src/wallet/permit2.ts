/**
 * Uniswap Permit2 funding path for the vault's `bytes permit2Data` arg — the
 * vault decodes `(PermitSingle, signature)`, replays
 * `permit2.permit(from, permitSingle, sig)` then
 * `permit2.transferFrom(from, vault, amount, token)`. Needs, once:
 * `approve(asset, PERMIT2, max)`, then a fresh `PermitSingle` signature whose
 * window derives from CHAIN time (never `Date.now()`). Clean port of the
 * legacy `earn/permit2.ts`.
 */

import {
  type Address,
  encodeAbiParameters,
  type Hex,
  parseAbiParameters,
  type TypedData,
  type TypedDataDomain,
} from "viem";
import { permit2Table } from "./calls";
import { type EnginePublicClient, readCall } from "./engine";

/** Canonical Permit2 deployment — identical address on every chain. */
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

/** 30 days — default validity window for the Permit2 allowance. */
export const DEFAULT_PERMIT_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;
/** 30 minutes — default deadline for the signature itself. */
export const DEFAULT_SIG_DEADLINE_SECONDS = 30 * 60;

/** `allowance(owner, token, spender)` on Permit2 — the rolling nonce source. */
export async function readPermit2Allowance(
  client: EnginePublicClient,
  params: { owner: Address; token: Address; spender: Address },
): Promise<{ amount: bigint; expiration: number; nonce: number }> {
  const [amount, expiration, nonce] = await readCall<[bigint, number, number]>(
    permit2Table.allowance,
    client,
    { address: PERMIT2_ADDRESS, args: [params.owner, params.token, params.spender] },
  );
  return { amount, expiration, nonce };
}

/** The EIP-712 `PermitSingle` message the vault decodes + replays. */
export interface PermitSingle {
  details: { token: Address; amount: bigint; expiration: number; nonce: number };
  spender: Address;
  sigDeadline: bigint;
}

const PERMIT2_TYPES = {
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
} as const satisfies TypedData;

function permit2Domain(chainId: number): TypedDataDomain {
  return { name: "Permit2", chainId, verifyingContract: PERMIT2_ADDRESS };
}

/** The `{ domain, types, primaryType, message }` payload for a PermitSingle. */
export function buildPermitSingleTypedData(permit: PermitSingle, chainId: number) {
  return {
    domain: permit2Domain(chainId),
    types: PERMIT2_TYPES as unknown as TypedData,
    primaryType: "PermitSingle" as const,
    message: permit as unknown as Record<string, unknown>,
  };
}

/** ABI tuple matching Solidity `IAllowanceTransfer.PermitSingle`. */
const PERMIT_SINGLE_ABI_PARAMS = parseAbiParameters(
  "((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes signature",
);

/** ABI-encode `(PermitSingle, bytes signature)` exactly as the vault's
 *  `abi.decode(permit2Data, (PermitSingle, bytes))` expects. */
export function encodePermit2Data(permit: PermitSingle, signature: Hex): Hex {
  return encodeAbiParameters(PERMIT_SINGLE_ABI_PARAMS, [permit, signature]);
}

/** `(expiration, sigDeadline)` from a chain-time unix seconds base. Pure —
 *  the caller owns the clock (chain `block.timestamp`). */
export function permitDeadlines(nowSeconds: number): {
  expiration: number;
  sigDeadline: bigint;
} {
  return {
    expiration: nowSeconds + DEFAULT_PERMIT_EXPIRATION_SECONDS,
    sigDeadline: BigInt(nowSeconds + DEFAULT_SIG_DEADLINE_SECONDS),
  };
}
