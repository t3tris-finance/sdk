export { ApiError, type T3trisClientOptions } from "../api/client";
export type {
  AccountActivityInput,
  AccountFavoritesInput,
  AccountPositionsInput,
  AccountVaultsInput,
  ActivityInput,
  AddOrgMemberInput,
  AnnotationInput,
  AttachVaultInput,
  CreateOrgInput,
  CreateOrgKeyInput,
  EmailRegisterInput,
  EventFilter,
  EventsInput,
  HistoryInput,
  HistoryRange,
  ListAssetsInput,
  ListVaultsInput,
  LookupVaultsInput,
  Page,
  PageInput,
  PayOrgSubscriptionInput,
  RequestOptions,
  SessionAuth,
  SetAccountFavoriteInput,
  SiweNonceInput,
  SiweVerifyInput,
  SortDirection,
  UpdateOrgInput,
  UpdateOrgKeyInput,
  VaultMetadataInput,
} from "../api/inputs";
export { SESSION_HEADER } from "../api/inputs";
export type { T3trisClient } from "../api/types";
export type { T3trisWalletClient } from "../onchain/client";
export { createT3trisClient, type T3trisApiOptions, type T3trisWalletOptions } from "./unified";
