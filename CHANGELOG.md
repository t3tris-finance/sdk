# Changelog

All notable changes to `@t3tris/sdk` are documented here. The package follows
SemVer: while it is `0.x`, minor releases may contain breaking changes, each
listed with migration notes. Deprecations are announced at least one minor
release before removal.

## 0.6.0

- `keys.create({ name, scopes?, monthlyQuota? })` creates an independent API key
  in the same organization using `manage` scope. Returns `{ id, secret }` once.
- `keys.attachVault` / `keys.detachVault` now take `{ keyId?, vaults: VaultRef[] }`:
  atomic, idempotent batches of 1–100 references. Omit `keyId` for the calling key;
  explicit targets must be active keys in the same organization. Returns the
  normalized processed references as `{ keyId, vaults }`.
- Replace `keys.lookupVaults` with `keys.hasVaults(refs): Promise<boolean[]>`.
  Availability results preserve reference order and duplicates (maximum 100).
- `keys.listVaults` accepts an optional target `keyId` with `manage` scope.
- New keys behave exactly like keys created in Curate, with no relationship to
  the creating key. Existing released versions are unchanged.

## 0.5.0

- `keys.listVaults(input?: PageInput)` returns `Page<Vault>` with real server-side
  keyset pagination. Default page size is 50, maximum 200; order is chain ID then
  address. Continue with `nextCursor` without loading the full attachment set.
- From 0.4: read `page.items` instead of an array and follow `page.nextCursor`.
  The paginated `/v1/key/vaults` API must be deployed alongside this SDK version.

## 0.4.0

### Integration changes

- `keys.listVaults()` returns `Vault[]`, the complete quota-bounded attachment set.
  Replace `(await client.keys.listVaults()).items` with `await client.keys.listVaults()`.
  Paginated methods continue to return `Page<T>` and accept `PageInput`.
- Settlement and lifecycle previews return named models (`SettlePreview`,
  `SettleDepositsPreview`, `SettleRedemptionsPreview`, `OpenPreview`) instead of
  positional tuples. Read fields such as `preview.assetsFromCurator` directly.
- `SettleInput` distinguishes deposit/combined fee-claim options from the
  redemption-only `fullClaim` option. Pass only the fields for the chosen kind.

### Validation and transport

- Empty `vaults.getMany([])` returns an empty array without a request; inputs over
  100 references fail before IO. Annotation identifiers are URL-escaped.
- Transport controls reject invalid retry/deadline values, cancellation during
  retry backoff consistently throws `ApiError`, and extra headers cannot replace
  the configured API/session credentials.
- Regression coverage includes all paginated method families and every named
  settlement preview layout.

## 0.3.0

- Added `@t3tris/sdk/onchain` for protocol constants, deployment helpers, Permit2
  utilities and optional wallet-provider discovery. All actions use
  `createT3trisClient` from the package root.
- API and on-chain implementations are organized by transport and protocol
  resource. Client methods, transaction results and calldata are unchanged.
- The `/curate` and `/wallet` helper imports remain available as compatibility
  aliases. New integrations should use `/onchain`.

## 0.2.1

- API clients now connect to `https://api.t3tris.finance` by default, with no URL
  configuration required. Existing constructor and environment overrides are preserved.
- Customer examples need only an API key. Packaged-client smoke tests cover API
  defaults and both wallet initialization forms without API configuration.

## 0.2.0

Breaking on-chain migration:

- Use `createT3trisClient({ walletClient, publicClient })` or `{ provider, account }`.
  API construction remains unchanged. API and wallet capabilities are deliberately separate.
- `createCurate`, `bindEngineClients`, `createEngineClients`, `execute` and `*Steps`
  exports are removed. `curate.vault` becomes `client.vaults`, `curate.oracle`
  becomes `client.oracles`, and `curate.roles` becomes `client.roles`.
- Deploy with `client.vaults.create(payload)`. All writes submit only the requested
  transaction and return `{ status: "submitted" | "proposed", hash }`.
- Apps now own connection, chain switching, approvals, Permit2 signing, receipt
  waiting and workflow status. No implicit funding, claim-before-redeem or retries.
- All on-chain reads require `chainId`. Both wallet and public RPC chains are
  checked before writes, with account/network rechecks after simulation.
- `decreaseDepositRequest` requires `minAmountOut`. Token approvals require an
  explicit amount. `claimSilosPnl` uses `unsafe` and `redeemRequestId`, matching the contract.
- The distribution preserves modules so every entry point shares the same error
  constructors, with working Node ESM and TypeScript declarations.

## 0.1.0

- Install the SDK from its [public repository](https://github.com/t3tris-finance/sdk).
- On-chain actions take an `EngineWalletClient`. `bindEngineClients` adapts a
  viem or wagmi wallet client the caller already has. `createEngineClients`
  still adapts a raw EIP-1193 provider. This package does not depend on
  RainbowKit or wagmi.
- Removed `STARTER_OFFER`. Read
  `client.billing.getPricing()` and pay
  `usdcUnitsFromCents(pricing.starter.monthlyPriceCents)`.
- `catalog.listAssets` takes one options object (`{ chainId?, limit?, cursor? }`),
  matching `listChains`. A page object is no longer stringified into `chainId`.
  Migration: `listAssets(chainId, page)` → `listAssets({ chainId, ...page })`.
- `keys.lookupVaults` takes `LookupVaultsInput` (a read). `AttachVaultInput`
  remains the input for `attachVault` and `detachVault` only. The wire query
  is unchanged (`address`, optional `chainId`).
- Removed the unused `PricePoint` type. Nothing returned it, and there is no
  price-history endpoint. The live quote remains `Asset.latestPriceUsd` on
  `catalog.listAssets`.
- Wallet helpers now take optional bounds without changing the transactions
  existing callers send. `decreaseDepositSteps` accepts `minAmountOut`
  (default `0`, zero slippage). `depositSteps` / `requestDepositSteps` accept
  `approveAmount` (default an unlimited `maxUint256` approval to Permit2, or
  to the vault when `strategy` is `"native"`). `defaultSafeOracle` accepts
  deviation `bounds` (default up `2^128 - 1`, 100% down = `1e18`).
  `factoryOracleClone` is documented as the zero-address clone sentinel.
- Added an export-surface snapshot test. Runtime changes to the four documented
  package subpaths now require an explicit review and changelog entry.
- Use the documented package entry points rather than deep imports.

## [0.1.0] - 2026-09-28

First publish-ready release.

- API client over `/v1`: `catalog`, `billing`, `vaults`, `accounts`, `events`,
  `keys`, and `auth` namespaces via `createT3trisClient`. Calling-key usage is
  `billing.getUsage()` (`UsageSummary`); there is no `usage` namespace.
- Supported public subpaths: `@t3tris/sdk`, `@t3tris/sdk/entities`,
  `@t3tris/sdk/curate`, `@t3tris/sdk/wallet`.
- Streaming authenticates with short-lived single-use tickets
  (`POST /v1/stream/ticket`); `events.subscribe` adopts server watermarks and
  reports cursors via `onProgress`.
- Session lifecycle: `auth.logout` / `auth.logoutAll`; sessions are hashed at
  rest and capped at 20 concurrent per account.
- ESM-only distribution with bundled entrypoints and a full declaration tree.
- Runtime support: Node.js ≥ 20 (≥ 22 or a global `WebSocket` for
  `events.subscribe()`), modern browsers via a bundler.
