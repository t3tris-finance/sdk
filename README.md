# T3tris SDK

TypeScript client for the T3tris API, with wallet helpers for on-chain vault actions.
Read vault data and portfolios from your backend, subscribe to live events, or build
deposit and curator flows with a wallet your app already connects.

## Install

The SDK is available from this public GitHub repository. It is not on npm yet.
With [Bun](https://bun.sh):

```sh
bun add git+https://github.com/t3tris-finance/sdk.git#5987866a3eb197bd7eab6d082060159775836bdb
```

No SSH key or GitHub account is required. This command pins a specific revision
for reproducible installs. The GitHub package exports TypeScript source, so use
Bun or a TypeScript-aware bundler such as the one in Next.js or Vite. Plain Node.js
execution of these sources is not the supported installation path.

To try calls in a UI, see the [playground](https://github.com/t3tris-finance/playground).

## First API call

Create a customer API key in [T3tris Curate](https://curate.t3tris.finance/premium).
Set these variables on your **server**:

```sh
export T3TRIS_API_URL=https://api.t3tris.finance
export T3TRIS_API_KEY=sk_your_customer_key
```

```ts
import { createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient();
const chains = await client.catalog.listChains();
```

The client reads both environment variables by default. You can also pass
`{ baseUrl, apiKey }` directly. The base URL is the API origin, without `/v1`.

Keep your API key out of browser bundles. For a web app, call the SDK from your
backend and expose a same-origin route to your UI. The API does not allow
cross-origin browser requests.

## API resources

| Namespace | Use it for |
| --- | --- |
| `catalog` | Chains, assets, and latest USD asset quotes |
| `vaults` | Vault details, history, composition, activity, governance, and curator content |
| `accounts` | Address-based portfolios, positions, operated vaults, activity, and favorites |
| `events` | Polling events or subscribing to the live stream |
| `keys` | Looking up vaults and managing the calling key's vault attachments |
| `billing` | Current pricing, the calling key's usage, and organisation quota |
| `auth` | Email or SIWE login, session identity, and logout |

### Vault access and pagination

Customer keys see their attached vaults. A new key with no attachments returns an
empty vault list. Attach vaults in Curate, or use a key with the `manage` scope:

```ts
const matches = await client.keys.lookupVaults({ address: "0x..." });
const vault = matches[0];

if (vault) {
  await client.keys.attachVault({ chainId: vault.chainId, address: vault.address });
}

const page = await client.vaults.list({ limit: 20 });
if (page.nextCursor) {
  const nextPage = await client.vaults.list({ limit: 20, cursor: page.nextCursor });
}
```

Replace `0x...` with a full vault address. An attachment counts against your
organisation's vault quota. `chainId` is required when the address exists on more
than one chain. Detach with `client.keys.detachVault({ address, chainId })`.

Paginated methods return `{ items, nextCursor? }`. Reuse the same filters when
requesting the next page. Methods such as `vaults.getMany` and `keys.lookupVaults`
return arrays instead. Asset quotes are included in
`client.catalog.listAssets()` as `latestPriceUsd` when a price is available.

### Sessions and protected writes

Your `sk_` key authenticates every API call. Writes such as changing favorites or
curator metadata also require an `ss_` session proving the user's identity:

```ts
const session = await client.auth.loginEmail({
  email: "you@example.com",
  password: process.env.T3TRIS_PASSWORD!,
});

const identity = await client.auth.whoami({ session: session.token });
await client.auth.logout({ session: session.token });
```

For wallet identity, call `auth.createSiweNonce`, have the wallet sign the exact
returned message, then call `auth.verifySiwe({ message, signature })`. Pass the
returned token as the `{ session }` argument on protected methods.

Email sessions have no wallet and cannot authorise vault-content writes.
Wallet writes are permission-checked by the API. Store session tokens securely
on your backend, for example behind an httpOnly session cookie in a web app.

### Live events

Live subscriptions require the `stream` scope on your API key. A session token
cannot open a stream.

```ts
const controller = new AbortController();
const stop = setTimeout(() => controller.abort(), 30_000);

try {
  for await (const event of client.events.subscribe({}, { signal: controller.signal })) {
    // Handle event.type and event.data in your application.
  }
} finally {
  clearTimeout(stop);
}
```

The SDK reconnects after connection failures. Use the subscription's `onProgress`
callback to persist a resume cursor, then pass it as `since` on a later
subscription. For polling, use `client.events.list({ after })`.

## Timeouts and errors

Requests time out after 15 seconds by default. Retries are opt-in and apply only
to safe GET requests. Writes are never retried automatically.

```ts
import { ApiError, createT3trisClient } from "@t3tris/sdk";

const client = createT3trisClient({
  requestOptions: { timeoutMs: 10_000, retries: 2 },
});

try {
  const usage = await client.billing.getUsage();
} catch (error) {
  if (error instanceof ApiError) {
    // Inspect error.status, error.code, and error.requestId.
    // On 429, respect error.retryAfterMs before trying again.
  }
  throw error;
}
```

`ApiError` also exposes response `headers`. Quota and rate-limit errors are not
retried automatically. You can pass an `AbortSignal` in `requestOptions.signal`
to cancel requests.

## On-chain actions

Wallet transactions use separate imports and do not need an API key. Your app
owns the connect UI and network switching. The SDK has no wagmi or RainbowKit
dependency.

| Import | Contents |
| --- | --- |
| `@t3tris/sdk` | API client, `ApiError`, and public data types |
| `@t3tris/sdk/entities` | Data types such as `Vault`, `Position`, and `VaultRef` |
| `@t3tris/sdk/wallet` | Wallet adapters, deposit/withdraw flows, Permit2 funding, and the step executor |
| `@t3tris/sdk/curate` | `createCurate` for vault administration, roles, and oracle actions |

Use `bindEngineClients({ walletClient, publicClient })` with your existing viem
or wagmi clients. For a raw EIP-1193 provider, use `createEngineClients(provider)`.
Pass the resulting clients to the transaction flows or `createCurate`.
Import only the entry points above, rather than files under `src/` or `dist/`.

Review transaction parameters before requesting a signature:

- `depositSteps` and `requestDepositSteps` default to unlimited token approval.
  Set `approveAmount` to limit it.
- `decreaseDepositSteps` defaults `minAmountOut` to `0`, leaving no minimum asset
  return. Set an explicit floor for slippage protection.
- `defaultSafeOracle` defaults to an unbounded upward deviation and a 100%
  downward deviation. Set `bounds` for your risk policy.
- `factoryOracleClone` is a zero-address sentinel requesting a new SafeOracle
  clone, not the address of an existing oracle.

## Compatibility

ESM only. The API client targets Node.js 20+ after bundling/transpilation, or Bun.
Live subscriptions need a global `WebSocket`, available in Node.js 22+ and Bun.
Wallet helpers run in modern browsers through a bundler.

The SDK is currently `0.x`. Minor releases can contain breaking changes.
See the [changelog](./CHANGELOG.md) before upgrading and use
[GitHub issues](https://github.com/t3tris-finance/sdk/issues) to report bugs.
