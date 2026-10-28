/**
 * @t3tris/sdk — public SDK.
 *
 * Typed entities and request/response types for the T3tris API (`/v1`).
 * Calls are sent to the API; this package does not implement them locally.
 */
export declare const SDK_VERSION = "0.2.0";
export * from "./client/index.js";
export { FeeClaimType, type QueuedFee, type QueuedManagementFee, type SettleKind, } from "./curate/vault.js";
export * from "./entities/index.js";
export { ActionCancelledError, ChainMismatchError, PlatformActionError, type PublicClientSource, type TransactionResult, type WalletClientSource, } from "./wallet/engine.js";
export { type DeployVaultArgs, defaultSafeOracle, factoryOracleClone, type GlobalFeesParams, type SafeOracleParams, type VaultDeployParams, } from "./wallet/factory.js";
export { buildPermitSingleTypedData, encodePermit2Data, PERMIT2_ADDRESS, type PermitSingle, permitDeadlines, } from "./wallet/permit2.js";
