/**
 * @t3tris/sdk — public SDK.
 *
 * One constructor for server-side API access and explicit on-chain actions.
 * Typed entities, transaction results and protocol helpers.
 */
import packageJson from "../package.json" with { type: "json" };
export const SDK_VERSION = packageJson.version;
export * from "./client/index.js";
export * from "./entities/index.js";
export { buildPermitSingleTypedData, encodePermit2Data, PERMIT2_ADDRESS, permitDeadlines, } from "./onchain/permit2/index.js";
export { ActionCancelledError, ChainMismatchError, PlatformActionError, } from "./onchain/transport/engine.js";
export { FeeClaimType, } from "./onchain/vaults/admin.js";
export { defaultSafeOracle, factoryOracleClone, T3TRIS_FACTORY_ADDRESS, } from "./onchain/vaults/deployment.js";
