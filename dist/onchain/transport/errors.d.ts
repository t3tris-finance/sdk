/**
 * Produced error codes — the protocol's custom-error selectors mapped to
 * stable E_* codes for application error handling.
 */
import type { Hex } from "viem";
export type ErrorCode = string & `E_${string}`;
export declare const ERRORS: Record<Hex, ErrorCode>;
export declare function errorCodeOf(selector: Hex): ErrorCode | undefined;
