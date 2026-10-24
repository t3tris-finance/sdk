# @t3tris/sdk

Typed client for the T3tris API (`/v1`) plus the on-chain action engine.
The client is a typed wrapper: API calls go to `/v1`, and wallet actions are
sent by the connected wallet.

## Install

```sh
npm install @t3tris/sdk   # or: bun add / pnpm add / yarn add
```

## Quick start

```ts
import { createT3trisClient } from "@t3tris/sdk";

// Both options fall back to the T3TRIS_API_URL / T3TRIS_API_KEY env vars.
const client = createT3trisClient({ baseUrl: "https://api.t3tris.io", apiKey: "sk_…" });

const vaults = await client.vaults.list();
```

The `sk_…` API key identifies the caller. It is a secret: **server-side only**,
never ship it to a browser. The API sends no CORS headers, so browsers cannot call
it cross-origin — proxy through your own backend and keep the key there. Protected
user writes take a per-call `{ session }` (`ss_…`) on top of the key. A session
does not replace the key. See `client.auth` and `SessionAuth`.

Client namespaces: `catalog`, `billing`, `vaults`, `accounts`, `events`, `keys`,
`auth`. Live USD quotes are `Asset.latestPriceUsd` (with `latestPriceTs` and
`latestPriceSource`) on `catalog.listAssets`. There is no separate prices or
price-history resource.

`billing.getPricing()` returns the public commercial configuration.
`billing.getUsage()` returns the calling key's usage and the organization quota
for the current cycle (`UsageSummary`: one `key` meter and one `org` meter).
Per-member and per-key breakdowns are not on this client.

Starter and add-on amounts come from `client.billing.getPricing()`. Convert cents
with `usdcUnitsFromCents` (1 cent = 10_000 USDC base units). Do not hardcode a price.

## Transport and retries

Every call has a 15-second deadline by default. Configure `requestOptions` when
constructing the client to set an `AbortSignal`, timeout, or a number of retry
attempts. Retries are opt-in and apply only to safe GET requests; writes are
never retried automatically because `/v1` does not expose idempotency keys yet.

```ts
const client = createT3trisClient({
  baseUrl: "https://api.t3tris.io",
  apiKey: process.env.T3TRIS_API_KEY,
  requestOptions: { timeoutMs: 10_000, retries: 2 },
});
```

`ApiError` carries `status`, stable `code`, `requestId`, `retryAfterMs`, and the
response `headers`. On `429`, wait for `retryAfterMs` before issuing a new
request; do not rely on automatic retries for quota or rate-limit errors.

## Supported surface

These subpaths are the public, SemVer-covered contract. Nothing else is public —
do not deep-import into `dist/` internals.

| Subpath               | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `@t3tris/sdk`         | API client (`createT3trisClient`, `ApiError`) + all public entities      |
| `@t3tris/sdk/entities`| Public types only (`Vault`, `Position`, `StreamEvent`, `Address`, …)     |
| `@t3tris/sdk/curate`  | Curator on-chain admin: `createCurate` (vault/roles/oracle), role IDs    |
| `@t3tris/sdk/wallet`  | Depositor engine: flows, Permit2 funding, factory, wallet client         |

`@t3tris/sdk/curate` and `@t3tris/sdk/wallet` build and send **on-chain**
transactions through the wallet client you pass in. They do not call the API
and they do not connect a wallet. A viem `WalletClient`, a wagmi
`useWalletClient()` result, or any object with `account`, `getChainId`,
`switchChain`, `sendTransaction`, and `signTypedData` goes through
`bindEngineClients`. `createEngineClients(provider)` is the same adapter for a
raw EIP-1193 provider. `switchChain` is yours: wagmi adds a missing network,
a raw viem client only switches.
Wallet defaults below are permissive. This package does not tighten them:

- `depositSteps` / `requestDepositSteps` request an unlimited approval
  (`maxUint256`) to Permit2, or to the vault when `strategy` is `"native"`.
  Pass `approveAmount` for a finite amount.
- `decreaseDepositSteps` defaults `minAmountOut` to `0` (zero slippage — no
  floor on assets returned). Pass `minAmountOut` to set a floor.
- `defaultSafeOracle` uses an unbounded upward deviation (`2^128 - 1`) and
  100% down (`1e18`). Pass `bounds` to override either field.
- `factoryOracleClone` is the zero-address clone sentinel (`address(0)`), not
  a deployed oracle address. Passing it tells the factory to clone a fresh
  SafeOracle.

### Stability tiers

- **Core (`.` and `./entities`)** — customer data/API client. These are the
  default integration surface and receive normal SemVer/deprecation support.
- **On-chain (`./wallet` and `./curate`)** — explicitly public transaction
  builders for depositor and curator wallets. They are versioned contracts, but
  consumers must validate transaction intent in their own UI and keep injected
  wallet permissions scoped. Raw ABIs, calldata plumbing, deployment salts, and
  other module internals are intentionally not package subpaths.
- **Not public** — any import outside the subpaths above, including deep imports
  of `src/` or `dist/`. Those paths can change without a SemVer guarantee.

## Runtime support

- Node.js ≥ 20, ESM. `events.subscribe()` needs a global `WebSocket` → Node.js ≥ 22
  (or any runtime providing one).
- Modern browsers via a bundler (Vite/Next/esbuild/…). `wallet`/`curate` send
  transactions through the wallet client you pass in.
- ESM only in 0.x — there is no CommonJS build.

## Versioning

SemVer. While the package is `0.x`, minor releases may contain breaking changes;
every breaking change is listed in [CHANGELOG.md](./CHANGELOG.md) with migration
notes. Deprecations are announced at least one minor release before removal.

Source and issues: https://github.com/t3tris-finance/sdk

## Migration from the pre-release client

The pre-release monorepo SDK was never published to a registry. If you integrated
against a pre-release checkout:

| Before (pre-release)                     | Now                                                        |
| ---------------------------------------- | ---------------------------------------------------------- |
| Ad-hoc REST calls / `lib/api` wrappers   | `createT3trisClient()` namespaces (`client.vaults.list`, …)|
| `@t3tris/sdk/roles` helpers              | `@t3tris/sdk/curate` role constants (`VAULT_*_ROLE`, `roleId`) |
| On-chain deposit/withdraw app code       | `@t3tris/sdk/wallet` flows + step engine                   |
| `format` / `explorer` / `pnl` helpers    | No longer public — app-internal                            |

## Packaging (maintainers)

`@t3tris/sdk` is not on npmjs yet. Until the first release, the only installable
artifact is the tarball from `bun run pack` (`.pack/t3tris-sdk-<version>.tgz`).

This repository is the publishable `@t3tris/sdk`, extracted from
[`packages/sdk`](https://github.com/t3tris-finance/monorepo/tree/main/packages/sdk)
in the monorepo. The monorepo copy remains the workspace consumer. This
repository is what gets published.

The root manifest stays `private: true` and exports `src/`, so `bun test` and
`tsc` resolve source without a build. `bun run pack` rebuilds `dist/`, stages
`.pack/` with dist exports, and writes a tarball. The staged manifest records
`repository`, `homepage`, and `bugs` for this repository. It stays `private`
and does not set `license` or `publishConfig.access`.

```sh
bun install
bun run lint
bun run typecheck
bun run test
bun run build    # bundles dist/ (ESM + declarations)
bun run pack     # stages .pack/ with the publish manifest + tarball
bun run smoke    # pack + install/typecheck/bundle smoke tests on the tarball
```

`package.json` `version` and `SDK_VERSION` in `src/index.ts` must match. `pack`
exits if they differ. Bump both in the same change, and add a changelog entry.

### Publishing

Publishing to npmjs is prepared and **disabled**.

- [CI](.github/workflows/ci.yml) runs lint, typecheck, tests, and the pack
  smoke test on pull requests and on pushes to `main`. It does not publish.
- [Publish](.github/workflows/publish.yml) is triggered by a push to `main`
  (and `workflow_dispatch`), but its job is gated with `if: false`. A merge
  does not publish. `NPM_TOKEN` is not required while the job stays off.

Do not run `npm publish` locally. The root package and the staged `.pack/`
package are both private, and there is no `LICENSE` file. npm would reject
the publish, and this repository is not licensed for redistribution yet.

Before the first release, land one reviewed change that does all of the following:

1. Add a `LICENSE` file and set the `license` field on the staged manifest in
   `scripts/pack.ts`. The field is intentionally unset today.
2. Set `private` to `false` on that staged manifest only. Leave the root
   manifest `private: true` so `npm publish` at the repository root cannot
   ship TypeScript source.
3. Create an npm automation token that can publish `@t3tris/sdk` and store it
   as the Actions secret `NPM_TOKEN`.
4. In `.github/workflows/publish.yml`, replace `if: ${{ false }}` with
   `if: true` (or delete the condition). The job still refuses a private or
   unlicensed staged package before `npm publish --access public`.
5. Confirm `version` and `SDK_VERSION` are the version you want on the registry.

Provenance (`--provenance`) is left off because this repository is private.
Add it once the repository is public.
