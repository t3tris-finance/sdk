# T3tris SDK

One TypeScript constructor for the T3tris API and on-chain vault actions.
API credentials stay on your backend. Your browser uses the wallet your app has already connected.

## Install

```sh
bun add git+https://github.com/t3tris-finance/sdk.git
```

The public GitHub package exports TypeScript source. Use Bun or a TypeScript-aware
bundler such as Next.js or Vite. Commit your lockfile to pin the resolved revision.
The package is not published on npm yet.

## API calls (server)

Get a customer key from [Curate](https://curate.t3tris.finance/premium).

```ts
import { createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient({
  baseUrl: "https://api.t3tris.finance",
  apiKey: process.env.T3TRIS_API_KEY,
});

const chains = await client.catalog.listChains();
const vaults = await client.vaults.list({ limit: 20 });
```

Both settings can also come from `T3TRIS_API_URL` and `T3TRIS_API_KEY`.
The API origin has no `/v1` suffix. Customer vault lists contain only the vaults
attached to that key. Paginated methods return `{ items, nextCursor? }`.

| Namespace | Methods cover |
| --- | --- |
| `catalog` | Chains, assets and latest USD quotes |
| `vaults` | Details, history, composition, activity, governance and curator content |
| `accounts` | Portfolios, positions, activity and favorites |
| `events` | Polling and live subscriptions |
| `keys` | Vault lookup, attachments and detachments |
| `billing` | Pricing and usage |
| `auth` | SIWE/email sessions, identity and logout |

Keep API keys out of client components. Browser UI should call your own backend.
The API does not enable cross-origin browser requests. Protected writes take an
additional `{ session: "ss_..." }` argument. Email sessions cannot authorise wallet
writes. Live subscriptions require the key's `stream` scope. Attaching vaults
programmatically requires `manage`.

Requests have a 15-second default timeout. Configure `requestOptions` for a
shorter deadline, cancellation or optional GET retries. Writes are never retried.
`ApiError` exposes `status`, `code`, `requestId`, `retryAfterMs` and response headers.

## On-chain calls (wallet)

Pass existing viem or wagmi clients directly. No adapter, engine or separate
curator client is needed.

```ts
import { createT3trisClient } from "@t3tris/sdk";
import { createPublicClient, createWalletClient, custom } from "viem";

// Your app supplies its connected provider and selected account.
const transport = custom(provider);
const walletClient = createWalletClient({ account, transport });
const publicClient = createPublicClient({ transport });
const client = createT3trisClient({ walletClient, publicClient });

// Your app handles network selection before invoking the SDK.
await walletClient.switchChain({ id: 42161 });

const result = await client.vaults.setNextEntryFee({
  chainId: 42161,
  vault,
  wad: 10n ** 16n, // 1%, queued according to the vault's fee rules
});

// Receipt waiting is explicit and belongs to your app.
if (result.status === "submitted") {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: result.hash });
  if (receipt.status === "reverted") throw new Error("Transaction reverted");
}
```

Or use `createT3trisClient({ provider, account })` with an EIP-1193 provider and
an already-selected address. Construction never opens a connection popup.
Recreate the client when the selected wallet/account changes.

### One call, one explicit action

An on-chain write validates the wallet and RPC chain, simulates the requested
transaction, and submits it once. It returns `{ status, hash }` without waiting
for mining. `submitted` means broadcast, not confirmed. `proposed` means a contract
wallet returned a proposal identifier that must be executed in that wallet.
EIP-7702 delegated EOAs return `submitted`.

The SDK never switches chains, approves tokens, signs permits, claims pending
shares, retries a transaction, or waits for a receipt as a side effect of another
action. A wrong network throws `ChainMismatchError` before any transaction.

For a deposit, your app checks `client.tokens.allowance`, explicitly calls
`client.tokens.approve` if needed, waits for approval execution, and then calls
`client.vaults.deposit`. Approval amounts are explicit. A redeem never claims
deposit shares automatically. Settlement and fee claims never fund the curator
implicitly. Use native allowances or provide an explicitly signed `permit2Data`.

### Create a vault

```ts
const result = await client.vaults.create({
  chainId,
  factory,
  salt,       // bytes32, unique for this deployment
  params,     // VaultDeployParams: asset, roles, fees, lifecycle flags and metadata
  safeOracle, // explicit owner and deviation bounds for a fresh SafeOracle
  oracle,     // existing oracle address, or factoryOracleClone for a new clone
});
```

`client.vaults.read.previewAddress({ chainId, factory, deployer, salt })` predicts
the address. Creation does not attach the vault to an API key.
`defaultSafeOracle` and `factoryOracleClone` are exported helpers. The default
oracle bounds are permissive (unbounded up, 100% down), so choose explicit bounds
for your vault's risk policy.

### On-chain resources

| Namespace | Actions and reads |
| --- | --- |
| `vaults` | Create, deposit/redeem/request/claim, settlement, fees, lifecycle, whitelist, metadata, silos and recovery |
| `vaults.read` | Deposit/redeem previews, limits, balances, settlement previews, queued fees and factory address preview |
| `roles` / `roles.read` | Vault roles, batched changes, admin transfers and membership |
| `oracles` / `oracles.read` | Valuations, deviation bounds, roles and admin transfers |
| `tokens` | Explicit approve, allowance and balance reads |
| `permit2` | Allowance/nonce reads for apps preparing their own signatures |

All on-chain reads take `chainId` and verify the supplied RPC's network.
Amounts use raw token units (`bigint`). Fee rates use WAD (`10^18 = 100%`).
`decreaseDepositRequest` requires an explicit `minAmountOut`.
Batch methods submit one atomic multicall explicitly requested by the caller.

## Examples and compatibility

The [playground](https://github.com/t3tris-finance/playground) includes API calls
and viem examples for the on-chain surface. Live actions use real funds and gas.

The API client supports Bun and Node.js 20+ after transpilation. Live events need
a global `WebSocket` (Node.js 22+ or Bun). Browser wallet integrations require a
bundler. ESM only. Import types from `@t3tris/sdk/entities`, optional wallet helpers
from `@t3tris/sdk/wallet`, and role constants from `@t3tris/sdk/curate`.
There is no separate `createCurate` or `createEarn` constructor.

See [CHANGELOG.md](./CHANGELOG.md) for the 0.2 migration. Report bugs in
[GitHub issues](https://github.com/t3tris-finance/sdk/issues).
