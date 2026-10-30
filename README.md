# T3tris SDK

A TypeScript client for T3tris vault data and on-chain actions.
Use API credentials on your backend or connect an existing wallet to submit transactions.

## Installation

```sh
bun add git+https://github.com/t3tris-finance/sdk.git
```

The package includes ESM JavaScript and TypeScript declarations. Commit your lockfile
to keep installations reproducible.

## Client configuration

Use `createT3trisClient` from the package root for both API access and contract
operations. Configuration selects the capabilities of each instance. Keep API
clients on your server and wallet clients in the wallet-connected application.

Protocol constants, deployment types, Permit2 helpers and optional provider
discovery are available from `@t3tris/sdk/onchain`:

```ts
import { createT3trisClient } from "@t3tris/sdk";
import { VAULT_SETTLE_ROLE, factoryOracleClone } from "@t3tris/sdk/onchain";
```

## Read vault data

Create an API key in [T3tris Curate](https://curate.t3tris.finance/premium), then
configure the client on your server:

```ts
import { createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient({
  apiKey: process.env.T3TRIS_API_KEY,
});

const chains = await client.catalog.listChains();
const vaults = await client.vaults.list({ limit: 20 });
```

The client connects to the T3tris production API by default. If `T3TRIS_API_KEY`
is set on your server, you can also call `createT3trisClient()` without arguments.

**Keep API keys on your server.** For browser applications, expose a route on your
own backend. The T3tris API does not allow cross-origin browser requests.

### Available resources

| Namespace | Resources |
| --- | --- |
| `catalog` | Chains, assets and latest USD prices |
| `vaults` | Vault details, history, composition, activity, governance and content |
| `accounts` | Portfolios, positions, activity and favorites |
| `events` | Event history and live subscriptions |
| `keys` | Vault lookup and key attachments |
| `billing` | Pricing and usage |
| `auth` | SIWE and email authentication, sessions and logout |

Vault queries return the vaults attached to your key. Attach them in Curate or use
`client.keys.attachVault({ address, chainId })` with the `manage` scope.
Paginated methods return `{ items, nextCursor? }`. Pass `nextCursor` as `cursor`
with the same filters to retrieve the next page.

Protected writes require a user session in addition to the API key. Authenticate
with `client.auth`, then pass `{ session: token }` to the protected method.
Vault-content writes require an authorised wallet session, not an email session.

Live events use `client.events.subscribe()` and require the `stream` scope.
Pass an `AbortSignal` to stop a subscription. Persist a checkpoint only after
processing delivered events, then supply it as `since` to resume later.
`onProgress` also reports server watermarks across filtered rows.

## Submit an on-chain action

Pass your connected viem or wagmi clients directly:

```ts
import { createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient({ walletClient, publicClient });

const result = await client.vaults.setNextEntryFee({
  chainId: 42161,
  vault,
  wad: 10n ** 16n, // 1%, queued according to the vault's fee rules
});
```

With an EIP-1193 provider, use `createT3trisClient({ provider, account })` instead.
No API key is required. Your application connects the wallet and selects the network
before invoking an action. Recreate the client when the selected account changes.

Each write checks the wallet and RPC network, simulates the transaction and submits
it once. It does not switch networks, approve tokens, sign permits, claim shares,
retry or wait for a receipt as a side effect.

The result is `{ status, hash }`:

- **`submitted`**: the transaction was broadcast. Wait for its receipt to confirm execution.
- **`proposed`**: a contract wallet returned a proposal identifier. Complete execution in that wallet.

```ts
if (result.status === "submitted") {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: result.hash });
  if (receipt.status === "reverted") throw new Error("Transaction reverted");
}
```

### Create a vault

```ts
const result = await client.vaults.create({
  chainId,
  factory,
  salt,
  params,
  safeOracle,
  oracle,
});
```

`params` is a `VaultDeployParams` object containing the asset, owner, curator, fees,
metadata and lifecycle flags. Use a unique bytes32 `salt` for each deployment.
Provide an existing oracle address, or `factoryOracleClone` to create a SafeOracle
with your chosen owner and deviation bounds.

Predict the address with
`client.vaults.read.previewAddress({ chainId, factory, deployer, salt })`.
Creation does not attach the vault to an API key.

### On-chain resources

| Namespace | Actions and reads |
| --- | --- |
| `vaults` | Creation, deposits, redemptions, requests, claims, settlement, fees, lifecycle and configuration |
| `vaults.read` | Previews, limits, balances, queued fees and deployment address prediction |
| `roles` / `roles.read` | Vault permissions, batches, admin transfers and membership |
| `oracles` / `oracles.read` | Valuations, deviation bounds, permissions and admin transfers |
| `tokens` | Token approval, allowance and balance |
| `permit2` | Allowance and nonce reads |

Every on-chain call takes `chainId`. Amounts use raw token units as `bigint`.
Fee rates use WAD: `10^18` represents 100%.

For deposits, check the allowance and submit `client.tokens.approve` separately
when required. Wait for that approval to execute before depositing. Permit2 data
must be explicitly prepared and signed by your application.

`decreaseDepositRequest` requires `minAmountOut`. Choose oracle deviation bounds
for your risk policy: `defaultSafeOracle` has permissive defaults (unbounded up,
100% down). Batch methods submit one explicitly requested atomic multicall.

## Errors and cancellation

API requests have a 15-second default timeout. Set `requestOptions.timeoutMs`,
`signal` or `retries` when constructing an API client. Retries apply only to safe
GET requests. `ApiError` exposes `status`, `code`, `requestId`, `retryAfterMs` and
response headers. Respect `retryAfterMs` when handling rate limits.

On-chain methods throw `ChainMismatchError` for a wrong network,
`ActionCancelledError` for a rejected wallet request, or `PlatformActionError`
when a contract revert can be decoded. Transactions are never retried automatically.

## Runtime support

Node.js 20+ and Bun, ESM only. Live subscriptions need a global `WebSocket`,
available in Node.js 22+ and Bun. Browser wallet integrations use a bundler such
as Next.js or Vite. No wagmi or RainbowKit dependency is required.

[Interactive examples](https://github.com/t3tris-finance/playground) ·
[Changelog](./CHANGELOG.md) ·
[Report an issue](https://github.com/t3tris-finance/sdk/issues)
