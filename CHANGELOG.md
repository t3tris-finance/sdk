# Changelog

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
