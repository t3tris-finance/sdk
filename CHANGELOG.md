# Changelog

## Unreleased

- Normalize `oracles.read.defaultAdminDelay` from its decoded uint48 number
  to the documented bigint seconds result.
- Clarify that stream `onReady` runs once per connection, including reconnects,
  rather than only once per subscription.

## 0.8.0

### Breaking changes

- Remove the deprecated `@t3tris-labs/sdk/curate` and
  `@t3tris-labs/sdk/wallet` entry points and their compatibility files.
  Import constants and provider helpers from `@t3tris-labs/sdk/onchain`.
  Import `createT3trisClient`, wallet client types and transaction results
  from `@t3tris-labs/sdk`. `/entities` remains available for entity types.
- Git source checkouts no longer contain compiled `dist/` files. Install the
  published npm package for Node.js applications, not a Git dependency.

### Packaging

- The private development manifest resolves TypeScript sources. The npm
  manifest is generated separately and exports only built ESM JavaScript
  with TypeScript declarations, plus package metadata.
- Build the distribution from scratch for every package. Validate the actual
  tarball under Node.js 22/24/26, NodeNext/Bundler type resolution and browser
  bundling; reject removed subpaths and accidental source/compat files.
- API `/v0`, the unified client and existing action behavior are unchanged.

## 0.7.1

- No runtime changes; released to validate npm trusted publishing.

## 0.7.0

- API requests and live subscriptions use `/v0`.
- API `/v0` and SDK `0.x` remain unstable. Breaking changes may occur before
  the stable API `/v1` and SDK `1.0.0` release. Pin the SDK and review this
  changelog before upgrading; pinning the package does not freeze the server.

## 0.6.0

- Typed API client and explicit asynchronous vault actions through one client.
- Organization API key creation with one-time secrets, atomic batch vault
  attachments, ordered availability checks and paginated attachment lists.
- Consistent `{ chainId, address }` vault references for API and wallet calls.
- Wallet authentication with SIWE and explicit session lifecycle methods.
- Grouped vault creation inputs: identity fields, `config`, exclusive SafeOracle
  or existing-oracle configuration, `deployment` and `fees`.
- Optional metadata hash and oracle deviation bounds with documented defaults;
  fees and deviation bounds use bigint WAD values.
- Canonical factory for creation and prediction; all SDK-created vaults start
  asynchronous. Funding, requests, settlement and claims are separate actions.
- Named settlement previews, typed transaction results and explicit wallet/RPC
  chain checks. No implicit approvals, network switching or transaction retries.
