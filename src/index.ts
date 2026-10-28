/**
 * @t3tris/sdk — public SDK.
 *
 * Typed entities and request/response types for the T3tris API (`/v1`).
 * Calls are sent to the API; this package does not implement them locally.
 */
import packageJson from "../package.json" with { type: "json" };

export const SDK_VERSION = packageJson.version;

export * from "./client";
export {
  FeeClaimType,
  type QueuedFee,
  type QueuedManagementFee,
  type SettleKind,
} from "./curate/vault";
export * from "./entities";
export {
  ActionCancelledError,
  ChainMismatchError,
  PlatformActionError,
  type PublicClientSource,
  type TransactionResult,
  type WalletClientSource,
} from "./wallet/engine";
export {
  type DeployVaultArgs,
  defaultSafeOracle,
  factoryOracleClone,
  type GlobalFeesParams,
  type SafeOracleParams,
  type VaultDeployParams,
} from "./wallet/factory";
export {
  buildPermitSingleTypedData,
  encodePermit2Data,
  PERMIT2_ADDRESS,
  type PermitSingle,
  permitDeadlines,
} from "./wallet/permit2";
