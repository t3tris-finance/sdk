import type { ActivityCategory } from "../entities/activity";
import type { ApiScope } from "../entities/auth";
import type { OrgRole } from "../entities/org";
import type { Address, VaultRef } from "../entities/primitives";

/** Cursor pagination envelope. Non-paginated collection methods return arrays. */
export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/** The header carrying the `ss_…` session alongside the bearer `sk_…` key.
 * Protected methods send both: the key identifies the customer, the session
 * proves the write identity. */
export const SESSION_HEADER = "x-t3tris-session";

/** Per-call session credential for protected methods. Omitting it is a type
 * error — the write is rejected server-side without it. */
export interface SessionAuth {
  /** `ss_…` token from the SIWE/email sign-in flow. */
  session: string;
}

/** Transport controls. Retries are GET-only and opt-in; mutations are never
 * retried automatically until the API provides idempotency keys. */
export interface RequestOptions {
  signal?: AbortSignal;
  /** Deadline in milliseconds; client default is 15 seconds. */
  timeoutMs?: number;
  /** Retry attempts after the initial safe GET. */
  retries?: number;
}

export interface PageInput {
  limit?: number;
  cursor?: string;
}

/** Asset catalog page. `chainId` filters to one chain; omit it to list every chain. */
export interface ListAssetsInput extends PageInput {
  chainId?: number;
}

/** Activity feeds accept a server-side category filter so paging never spends a
 * slot on a category the caller does not render. Omit to receive every
 * non-hidden category. */
export interface ActivityInput extends PageInput {
  categories?: readonly ActivityCategory[];
}

export type SortDirection = "asc" | "desc";
export type HistoryRange = "1d" | "1w" | "1m" | "3m" | "1y" | "all";

export interface ListVaultsInput extends PageInput {
  chainIds?: number[];
  assetAddress?: Address;
  curatorAddress?: Address;
  kind?: "sync" | "async";
  verified?: boolean;
  search?: string; // name, symbol, curator
  sort?: "tvl" | "newest" | "name";
  direction?: SortDirection;
}

export interface HistoryInput {
  range?: HistoryRange; // default "1m"; server samples to ~300 points
}

export interface CreateOrgInput {
  name: string;
  /** Stable handle; derived from the name when omitted. Unique across orgs. */
  slug?: string;
}

export interface UpdateOrgInput {
  name: string;
}

export interface AddOrgMemberInput {
  /** Wallet (0x…). Exactly one of `address` or `email`. */
  address?: Address;
  email?: string;
  role: OrgRole;
}

export interface CreateOrgKeyInput {
  name: string;
  /** Customer keys: `public`, `stream`, `manage`. Default `public` + `stream`.
   * `gov` and `unlimited` are rejected. */
  scopes?: ApiScope[];
  vaults?: VaultRef[];
  /** Per-key monthly request cap. Omit or null = org quota only. */
  monthlyQuota?: number | null;
}

export interface UpdateOrgKeyInput {
  /** Replace the vault set. Omit to leave vaults unchanged. */
  vaults?: VaultRef[];
  /** Replace customer scopes (`public` / `stream` / `manage`). Omit to leave them. */
  scopes?: ApiScope[];
  /** Per-key monthly request cap. `null` clears it. Omit to leave unchanged. */
  monthlyQuota?: number | null;
}

/** Attach or detach a vault on a key. `chainId` is required only when the
 * address exists on more than one chain. */
export interface AttachVaultInput {
  address: Address;
  chainId?: number;
}

/** Atomic attachment mutation. Omit keyId to target the calling key.
 * An explicit target must be an active customer key in the same organization. */
export interface KeyVaultsInput {
  keyId?: string;
  vaults: VaultRef[];
}

export interface CreateKeyInput {
  name: string;
  /** Defaults to public + stream. Customer scopes only, as in Curate. */
  scopes?: ("public" | "stream" | "manage")[];
  monthlyQuota?: number;
}

export interface KeyVaultsPageInput extends PageInput {
  keyId?: string;
}

/** On-chain settlement of the org's quoted terms (Starter or a custom offer). */
export interface PayOrgSubscriptionInput {
  /** `quota_reset` charges the configured reset fee for the active plan;
   *  `credit_purchase` funds prepaid extra-usage credits by `amountCents`. */
  kind?: "subscription" | "quota_reset" | "credit_purchase";
  plan: "starter" | "custom";
  txHash: string;
  /** Required for `credit_purchase`: the USD credit to buy, in integer cents. */
  amountCents?: number;
}

/** Address-scoped query — identity is a parameter, not a session. */
export interface AccountVaultsInput extends PageInput {
  address: Address; // curator or owner
}

/** Favorites are address-scoped like the other account reads. */
export interface AccountFavoritesInput {
  address: Address;
}

export interface SetAccountFavoriteInput {
  address: Address;
  chainId: number;
  /** Vault address (0x…). */
  vault: Address;
  /** Defaults to true (favorite); false is the explicit negative pin. */
  pinned?: boolean;
}

export interface AccountPositionsInput extends PageInput {
  address: Address;
  chainId?: number;
}

/** A wallet's protocol activity. */
export interface AccountActivityInput extends PageInput {
  address: Address;
  chainId?: number;
  categories?: readonly ActivityCategory[];
}

/** Curator-editable content of a vault (SIWE session required server-side). */
export interface VaultMetadataInput {
  displayName?: string;
  description?: string;
  curatorName?: string;
  curatorUrl?: string;
  visibility?: "public" | "private";
  category?: string;
  showComposition?: boolean;
  compositionWallets?: Address[];
  depositDisclaimer?: string;
  depositDisclaimerTrigger?: "once" | "every";
}

/** A curator-pinned point on the vault's performance chart. */
export interface AnnotationInput {
  ts: number; // unix s — where the marker sits
  title: string;
  body?: string;
  /** Ordered labeled external links (up to 20). Pass [] to clear on edit. */
  links?: { title: string; url: string }[];
  /** Transaction link, used only when links is omitted. */
  txHash?: `0x${string}`;
}

export interface SiweNonceInput {
  address: Address;
  /** Host the SIWE message will carry (`domain`). */
  domain: string;
  /** Chain on which a contract wallet validates its signature. Defaults to 1 for EOAs. */
  chainId?: number;
}

export interface SiweVerifyInput {
  message: string; // the full SIWE message the wallet signed
  signature: `0x${string}`;
}

/** Live-stream subscription filter — the token is always the client's own
 * `sk_…` key (`stream` scope); sessions cannot open the stream. */
export interface EventFilter {
  /** Resume cursor — replay starts AFTER this seq. */
  since?: number;
  /** Start at the current outbox watermark rather than replaying history. */
  live?: boolean;
  /** Only receive these event types. */
  types?: string[];
}

/** Polled event outbox (`GET /v0/events`, `public` scope). */
export interface EventsInput extends PageInput {
  /** Exclusive resume checkpoint: only events with seq > after are returned.
   * Use the last event's seq (or a stream `onProgress` checkpoint) to resume. */
  after?: number;
  /** Only these event types, e.g. ["vault.metadata.updated"]. */
  types?: string[];
}
