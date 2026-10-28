/**
 * @t3tris/sdk — public SDK.
 *
 * Typed entities and request/response types for the T3tris API (`/v1`).
 * Calls are sent to the API; this package does not implement them locally.
 */
import packageJson from "../package.json" with { type: "json" };
export const SDK_VERSION = packageJson.version;
export * from "./client/index.js";
export { FeeClaimType, } from "./curate/vault.js";
export * from "./entities/index.js";
export { ActionCancelledError, ChainMismatchError, PlatformActionError, } from "./wallet/engine.js";
export { defaultSafeOracle, factoryOracleClone, } from "./wallet/factory.js";
export { buildPermitSingleTypedData, encodePermit2Data, PERMIT2_ADDRESS, permitDeadlines, } from "./wallet/permit2.js";
