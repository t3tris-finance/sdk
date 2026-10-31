# T3tris SDK

A TypeScript client for T3tris vault data and on-chain actions.
Use API credentials on your backend or connect an existing wallet to submit transactions.

> **Unstable API and SDK:** SDK **0.7.0** targets API **`/v0`**. Breaking changes
> may occur before API `/v1` and SDK `1.0.0`. Pin your SDK version and review the
> changelog before upgrading. Pinning the SDK does not freeze the API server;
> server changes can also require integration updates.

## Installation

```sh
bun add git+https://github.com/t3tris-finance/sdk.git
```

The package includes ESM JavaScript and TypeScript declarations. Commit your lockfile
to keep installations reproducible. The lockfile records the exact SDK commit
used by your integration.

## Client configuration

Use `createT3trisClient` from the package root for both API access and contract
operations. Configuration selects the capabilities of each instance. Keep API
clients on your server and wallet clients in the wallet-connected application.

Protocol constants, deployment types, Permit2 helpers and optional provider
discovery are available from `@t3tris/sdk/onchain`:

```ts
import { createT3trisClient } from "@t3tris/sdk";
import { VAULT_SETTLE_ROLE, defaultSafeOracle } from "@t3tris/sdk/onchain";
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
| `auth` | Wallet authentication with SIWE, sessions and logout |

Vault queries return the vaults attached to your key. Attach them in Curate or use
`client.keys.attachVault({ vaults: [{ address, chainId }] })` with the `manage` scope.
Paginated methods return `{ items, nextCursor? }`. Pass `nextCursor` as `cursor`
with the same filters to retrieve the next page. `keys.listVaults({ limit, cursor })`
is paginated too (default 50, maximum 200), ordered by chain ID then address.
`vaults.getMany(refs)` returns a bounded array. `keys.hasVaults(refs)` returns
one availability boolean per reference, preserving input order and duplicates.

Protected writes require a user session in addition to the API key. Authenticate
with `client.auth`, then pass `{ session: token }` to the protected method.
Vault-content writes require an authorised wallet session.

Live events use `client.events.subscribe()` and require the `stream` scope.
Pass an `AbortSignal` to stop a subscription. Persist a checkpoint only after
processing delivered events, then supply it as `since` to resume later.
`onProgress` also reports server watermarks across filtered rows.

## Manage organization keys

A backend holding a `manage` key can create independent keys in its organization,
just like creating keys in Curate. Save the returned secret once:

```ts
const key = await client.keys.create({
  name: "Customer integration",
  scopes: ["public", "stream"],
});
await client.keys.attachVault({ keyId: key.id, vaults: [{ chainId, address }] });
```

There is no parent/child relationship. Revoking the creating key does not revoke
other keys. A manage key can target any active customer key in its organization.
Omit `keyId` to target the calling key. Attachment batches take 1–100 references
and are atomic and idempotent. Results contain the target `keyId` and normalized
processed references, not its entire attachment collection. Use paginated
`keys.listVaults({ keyId, limit, cursor })` for that collection.

`hasVaults` checks indexed availability, not membership. Key creation and
attachments share your organization's existing subscription quotas.

## Submit an on-chain action

Pass your connected viem or wagmi clients directly:

```ts
import { createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient({ walletClient, publicClient });

const result = await client.vaults.setNextEntryFee({
  chainId: 42161,
  address: vault,
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

### Preview settlement

```ts
const preview = await client.vaults.read.previewSettleAll({ chainId, address: vault });
const requiredCuratorAssets = preview.assetsFromCurator;
const managementFeeAssets = preview.lastPeriodData.managementFeeAssets;
```

Preview results use named, typed fields. Prepare required funding and obtain user
confirmation before a separate `vaults.settle` call.

### Request an asynchronous deposit

```ts
const result = await client.vaults.requestDeposit({
  chainId,
  address: vault,
  amount: 1_000_000n,
  controller: account,
});
```

Approve funding first, then confirm request execution. Settlement and
`vaults.claimDeposit({ chainId, address: vault, receiver: account })` are later, separate
transactions. Amounts use the underlying token's decimals.

### Create a vault

```ts
const result = await client.vaults.create({
  chainId,
  name: "My Vault",
  symbol: "mvUSDC",
  asset,
  owner,
  curator,
  feeRecipient,
  config: {
    ipfsHash: "", // Optional metadata hash; defaults to "".
    transferEnabled: true, // Allow share transfers.
    depositEnabled: true, // Allow async deposit requests; vault still starts closed.
    depositWhitelistEnabled: false, // No deposit whitelist restriction.
    withdrawWhitelistEnabled: false, // No withdrawal whitelist restriction.
  },
  oracle: {
    safe: true, // Create a new SafeOracle.
    owner, // Address that administers the oracle.
    maxDeviationUp: (1n << 128n) - 1n, // Optional WAD bound; default is effectively unbounded.
    maxDeviationDown: 10n ** 18n, // Optional WAD bound; default allows a 100% decrease.
  },
  deployment: {
    salt, // Unique bytes32 salt for this deployer.
    referralCode, // Optional bytes32; omit when there is no referral.
  },
  fees: {
    entry: 0n, // WAD: 10^16 = 1%; 0 = no entry fee.
    exit: 0n, // WAD: 10^16 = 1%; 0 = no exit fee.
    performance: 0n, // WAD: 10^16 = 1%; 0 = no performance fee.
    management: 0n, // WAD rate accrued over managementDays; 0 = no fee.
    managementDays: 365, // Management-fee accrual period in whole days.
  },
});
```

For an existing oracle, use `oracle: { address: oracleAddress }` instead. The two
variants are mutually exclusive. SafeOracle deviation bounds `maxDeviationUp`
and `maxDeviationDown` are optional bigint WAD values. They default independently
to `2^128 − 1` (unbounded upward) and `10^18` (100% downward), matching Curate.
Set explicit bounds for your risk policy. The SafeOracle owner is required.
Fee rates are bigint WAD (`10^16` = 1%); `managementDays` is integer days.

Creation and prediction use the canonical factory
`0x0000000000CC53b5Fd649b80f08b05405779cC71` on supported chains. No factory input
is required. Every deployment starts async; `vaultOpened` is not exposed and is
always encoded false. `deployment.salt` is required bytes32; optional bytes32
`deployment.referralCode` attributes the deployment to a referral and defaults to
zero when omitted.

Predict the address with
`client.vaults.read.previewAddress({ chainId, deployer, salt })`.
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

Requires Node.js 22+ or Bun, including live subscriptions. Browser wallet
integrations require an ESM-compatible bundler such as Next.js or Vite.

SDK development uses Node.js 26 LTS (`.nvmrc`); CI checks Node.js 22, 24 and 26.
No wagmi or RainbowKit dependency is required for wallet integration.

[Interactive examples](https://github.com/t3tris-finance/playground) ·
[Changelog](./CHANGELOG.md) ·
[Report an issue](https://github.com/t3tris-finance/sdk/issues)
