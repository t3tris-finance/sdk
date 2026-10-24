/** One identity: wallet (SIWE) or email — never both forced. */
export interface Account {
  id: string;
  address?: `0x${string}`;
  email?: string;
  createdAt: number; // unix s
}

export interface Session {
  id: string;
  accountId: string;
  createdAt: number; // unix s
  expiresAt: number; // unix s
}

/** Capabilities on an `sk_…` key. Sessions (`ss_…`) have no scopes.
 *  `public`  — catalog, vaults, poll `GET /v1/events`. Live USD quotes are
 *              `Asset.latestPriceUsd` on `catalog.listAssets`.
 *  `stream`  — live `GET /v1/stream` websocket (API keys only)
 *  `manage`  — this key may attach/detach its own vaults
 *  `gov`     — not a customer scope; never customer-minted */
export type ApiScope = "public" | "stream" | "manage" | "gov";

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string; // display prefix; full token shown once at creation
  scopes: ApiScope[];
  /** Per-key monthly request cap. Omitted = org quota only. */
  monthlyQuota?: number;
  createdAt: number; // unix s
  lastUsedAt?: number;
  revokedAt?: number;
}

/** Issued by POST /v1/auth/* — an `ss_…` bearer token and the account behind
 * it. Keep the token server-side; never ship it to a browser. */
export interface AuthSession {
  token: string;
  account: Account;
}

/** One org the session's account belongs to. */
export interface WhoamiOrg {
  id: string;
  uuid: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

export interface Whoami {
  account: Account;
  orgs: WhoamiOrg[];
}
