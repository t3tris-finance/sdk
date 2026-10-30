export { ApiError, type T3trisClientOptions } from "../api/client.js";
export type { AccountActivityInput, AccountFavoritesInput, AccountPositionsInput, AccountVaultsInput, ActivityInput, AddOrgMemberInput, AnnotationInput, AttachVaultInput, CreateOrgInput, CreateOrgKeyInput, EmailRegisterInput, EventFilter, EventsInput, HistoryInput, HistoryRange, ListAssetsInput, ListVaultsInput, LookupVaultsInput, Page, PageInput, PayOrgSubscriptionInput, RequestOptions, SessionAuth, SetAccountFavoriteInput, SiweNonceInput, SiweVerifyInput, SortDirection, UpdateOrgInput, UpdateOrgKeyInput, VaultMetadataInput, } from "../api/inputs.js";
export { SESSION_HEADER } from "../api/inputs.js";
export type { T3trisClient } from "../api/types.js";
export type { T3trisWalletClient } from "../onchain/client.js";
export { createT3trisClient, type T3trisApiOptions, type T3trisWalletOptions } from "./unified.js";
