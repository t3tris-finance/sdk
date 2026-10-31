/**
 * @t3tris/sdk — public SDK.
 *
 * One constructor for server-side API access and explicit on-chain actions.
 * Typed entities, transaction results and protocol helpers.
 */
import packageJson from "../package.json" with { type: "json" };

export const SDK_VERSION = packageJson.version;

export * from "./client";
export * from "./entities";
export {
  buildPermitSingleTypedData,
  encodePermit2Data,
  PERMIT2_ADDRESS,
  type PermitSingle,
  permitDeadlines,
} from "./onchain/permit2";
export {
  ActionCancelledError,
  ChainMismatchError,
  PlatformActionError,
  type PublicClientSource,
  type TransactionResult,
  type WalletClientSource,
} from "./onchain/transport/engine";
export type { SettleInput } from "./onchain/vaults/admin";
export {
  FeeClaimType,
  type QueuedFee,
  type QueuedManagementFee,
  type SettleKind,
} from "./onchain/vaults/admin";
export {
  type DeployVaultArgs,
  defaultSafeOracle,
  factoryOracleClone,
  type GlobalFeesParams,
  type SafeOracleParams,
  T3TRIS_FACTORY_ADDRESS,
  type VaultDeployParams,
} from "./onchain/vaults/deployment";
export type {
  EntryFees,
  ExitFees,
  GrossTvlData,
  LastPeriodData,
  NetDepositFlowData,
  NetRedeemFlowData,
  NetTvlData,
  OpenPreview,
  SettleDepositsPreview,
  SettlementPreview,
  SettlePreview,
  SettleRedemptionsPreview,
  UnclaimedFeesData,
} from "./onchain/vaults/previews";
