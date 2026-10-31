import type {
  AccountFavorites,
  AccountPortfolio,
  ActivityEvent,
  Asset,
  AuthSession,
  Chain,
  Position,
  Vault,
  VaultAnnotation,
  VaultComposition,
  VaultGovernance,
  VaultSnapshot,
  Whoami,
} from "../entities";

import type { BillingPricing, UsageSummary } from "../entities/org";
import type { Address, VaultRef } from "../entities/primitives";
import type { StreamEvent } from "../entities/stream";
import type {
  AccountActivityInput,
  AccountFavoritesInput,
  AccountPositionsInput,
  AccountVaultsInput,
  ActivityInput,
  AnnotationInput,
  CreateKeyInput,
  EmailRegisterInput,
  EventFilter,
  EventsInput,
  HistoryInput,
  KeyVaultsInput,
  KeyVaultsPageInput,
  ListAssetsInput,
  ListVaultsInput,
  Page,
  PageInput,
  SessionAuth,
  SetAccountFavoriteInput,
  SiweNonceInput,
  SiweVerifyInput,
  VaultMetadataInput,
} from "./inputs";

/**
 * Key-authenticated `/v1` client, namespaced by resource. The bearer `sk_…`
 * key identifies the caller. Protected methods take a per-call `{ session }`
 * (`ss_…`) on the `x-t3tris-session` header beside the key — a session never
 * replaces the key, and there is no second client. Account reads take an
 * `address` argument and do not use the session.
 */
export interface T3trisClient {
  // — catalog (dimension data + the public commercial configuration) —
  catalog: {
    listChains(input?: PageInput): Promise<Page<Chain>>;
    /** Assets are paginated and include the latest USD quote when known. */
    listAssets(input?: ListAssetsInput): Promise<Page<Asset>>;
  };
  billing: {
    /** Live operator quote for Starter and add-ons. This is the amount to pay. */
    getPricing(): Promise<BillingPricing>;
    /** Calling key's usage and organization quota for the current cycle. */
    getUsage(): Promise<UsageSummary>;
  };

  // — vaults (every vault argument is a VaultRef) —
  vaults: {
    /** Unlimited first-party keys: public Earn catalog. Customer keys: only
     * vaults attached to that key (empty until attachVault / Curate add). */
    list(input?: ListVaultsInput): Promise<Page<Vault>>;
    /** Address-known access. Unlimited keys resolve private vaults by ref
     * (explorer list still filters visibility). Customer keys 404 unless the
     * vault is attached. Governance hide 404s everyone. */
    get(ref: VaultRef): Promise<Vault>;
    /** Visibility-blind config lookup by explicit refs (≤100). Unknown refs are
     * absent from the result; used by address-scoped surfaces like the portfolio
     * so a wallet's own private positions still render names/config. Returns a
     * bounded array — no cursor. */
    getMany(refs: VaultRef[]): Promise<Vault[]>;
    listHistory(ref: VaultRef, input?: HistoryInput & PageInput): Promise<Page<VaultSnapshot>>;
    getComposition(ref: VaultRef): Promise<VaultComposition | null>;
    listActivity(ref: VaultRef, input?: ActivityInput): Promise<Page<ActivityEvent>>;
    listAnnotations(ref: VaultRef, input?: PageInput): Promise<Page<VaultAnnotation>>;
    /** Roles, role-admin edges, whitelist rows, and depositor count.
     * `public` scope. Customer keys 404 unless the vault is attached. */
    getGovernance(ref: VaultRef): Promise<VaultGovernance>;

    // — curator content writes (session required; permission-checked against
    //    on-chain curator/owner + editor seats; read-only wallets can't have a
    //    session, so they fail server-side by construction) —
    updateMetadata(ref: VaultRef, input: VaultMetadataInput, auth: SessionAuth): Promise<Vault>;
    createAnnotation(
      ref: VaultRef,
      input: AnnotationInput,
      auth: SessionAuth,
    ): Promise<VaultAnnotation>;
    updateAnnotation(
      ref: VaultRef,
      annotationId: string,
      input: AnnotationInput,
      auth: SessionAuth,
    ): Promise<VaultAnnotation>;
    deleteAnnotation(ref: VaultRef, annotationId: string, auth: SessionAuth): Promise<void>;
  };

  // — accounts (identity as a parameter; favorite writes are the session
  //    exception — changing a pin requires the signed-in wallet) —
  accounts: {
    /** The wallet's portfolio in one call: every indexed position plus the
     * directory record of each vault behind it. Returned whole, no cursor. */
    portfolio(input: { address: Address }): Promise<AccountPortfolio>;
    /** Vaults this account operates (curator or owner) — public AND private. */
    listVaults(input: AccountVaultsInput): Promise<Page<Vault>>;
    listPositions(input: AccountPositionsInput): Promise<Page<Position>>;
    listActivity(input: AccountActivityInput): Promise<Page<ActivityEvent>>;
    listFavorites(input: AccountFavoritesInput): Promise<AccountFavorites>;
    /** Upserts the pin; 403 when the address neither holds a position nor
     * operates the vault (curator/owner/deployer). */
    setFavorite(input: SetAccountFavoriteInput, auth: SessionAuth): Promise<AccountFavorites>;
    /** Removes the pin row entirely (back to the funded/verified default). */
    deleteFavorite(
      input: AccountFavoritesInput & {
        chainId: number;
        vault: Address;
      },
      auth: SessionAuth,
    ): Promise<void>;
  };

  // — events (the outbox feed; the stream is the WS push of the same events) —
  events: {
    list(input?: EventsInput): Promise<Page<StreamEvent>>;
    /** Live stream as an async iterator (`sk_…` with `stream`; sessions are
     * rejected). Reconnects with backoff, resuming from the last seen seq;
     * ends on `signal` abort or a clean close, throws ApiError on an auth
     * denial. `onProgress` reports the acknowledged server cursor (it advances
     * across filtered rows) — persist it to resume later subscriptions.
     * `onReady` fires once the first server replay/watermark is established.
     * Progress can precede asynchronous processing: commit a durable checkpoint
     * only after all preceding delivered events have been applied. */
    subscribe(
      filter?: EventFilter,
      options?: {
        signal?: AbortSignal;
        onProgress?: (cursor: number) => void;
        onReady?: () => void;
      },
    ): AsyncIterableIterator<StreamEvent>;
  };

  // — key self-service and organization key management —
  keys: {
    /** Manage scope: create an independent key in this organization.
     * The secret is returned exactly once, as when creating a key in Curate. */
    create(input: CreateKeyInput): Promise<import("../entities/org").KeyCreated>;
    /** Atomic, idempotent batch (1–100 refs), self or another customer key in this org. */
    attachVault(input: KeyVaultsInput): Promise<import("../entities/org").KeyVaultsResult>;
    detachVault(input: KeyVaultsInput): Promise<import("../entities/org").KeyVaultsResult>;
    /** Paginated attached vaults, ordered by chain ID then address. Requires public
     * scope. Pass nextCursor as cursor to continue. Default 50, maximum 200. */
    listVaults(input?: KeyVaultsPageInput): Promise<Page<Vault>>;
    /** Indexed, non-governance-hidden existence (not attachment membership).
     * 0–100 refs; booleans preserve input order and duplicates. */
    hasVaults(refs: VaultRef[]): Promise<boolean[]>;
  };

  // — auth (SIWE proves wallet control — read-only wallets never get a
  //    session; email accounts skip the wallet entirely) —
  auth: {
    createSiweNonce(input: SiweNonceInput): Promise<{ nonce: string; message: string }>;
    verifySiwe(input: SiweVerifyInput): Promise<AuthSession>;
    registerEmail(input: EmailRegisterInput): Promise<AuthSession>;
    loginEmail(input: EmailRegisterInput): Promise<AuthSession>;
    /** The session's account + org memberships. Session required. */
    whoami(auth: SessionAuth): Promise<Whoami>;
    /** Revoke the presenting session (logout). */
    logout(auth: SessionAuth): Promise<void>;
    /** Revoke every session of the session's account (logout everywhere). */
    logoutAll(auth: SessionAuth): Promise<void>;
  };
}
