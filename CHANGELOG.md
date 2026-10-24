# Changelog

All notable changes to `@t3tris/sdk` are documented here. The package follows
SemVer: while it is `0.x`, minor releases may contain breaking changes, each
listed with migration notes. Deprecations are announced at least one minor
release before removal.

## Unreleased

- Publishable source now lives in the [sdk repository](https://github.com/t3tris-finance/sdk).
  npmjs publication is prepared and not enabled.
- On-chain actions take an `EngineWalletClient`. `bindEngineClients` adapts a
  viem or wagmi wallet client the caller already has. `createEngineClients`
  still adapts a raw EIP-1193 provider. This package does not depend on
  RainbowKit or wagmi.
- Removed `STARTER_OFFER`. It was a hardcoded seed, not the live quote, so paying
  `STARTER_OFFER.usdcUnits` could disagree with operator pricing. Read
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
- Documented Core versus on-chain SDK stability tiers; `sdk-internal` and all
  deep imports remain unsupported implementation details.

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
