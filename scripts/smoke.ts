/**
 * Pack the SDK and smoke-test the tarball the way customers consume it:
 * install it into throwaway fixtures, then (1) import every subpath at runtime
 * under Node, (2) typecheck it under NodeNext and Bundler resolution, and
 * (3) bundle it for a browser target. Any failure exits non-zero.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pkgDir = join(import.meta.dir, "..");

const pack = Bun.spawnSync(["bun", "scripts/pack.ts"], {
  cwd: pkgDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (pack.exitCode !== 0) process.exit(pack.exitCode);

const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
  version: string;
};
const tarball = join(pkgDir, ".pack", `t3tris-sdk-${version}.tgz`);
const workDir = mkdtempSync(join(tmpdir(), "t3tris-sdk-smoke-"));

function run(cmd: string[], cwd: string, label: string): void {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) {
    console.error(`smoke failed: ${label}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
}

function makeFixture(name: string): string {
  const dir = join(workDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name,
        private: true,
        type: "module",
        dependencies: { "@t3tris/sdk": `file:${tarball}` },
      },
      null,
      2,
    )}\n`,
  );
  run(["bun", "install"], dir, `${name}: install tarball`);
  return dir;
}

// 1. Node runtime: every subpath imports and the client shape is intact.
const nodeDir = makeFixture("node");
writeFileSync(
  join(nodeDir, "main.mjs"),
  `import { createT3trisClient, SDK_VERSION } from "@t3tris/sdk";
import { VAULT_SETTLE_ROLE } from "@t3tris/sdk/onchain";
import * as entities from "@t3tris/sdk/entities";
import * as wallet from "@t3tris/sdk/onchain";
import * as compatibleWallet from "@t3tris/sdk/wallet";
import * as compatibleConstants from "@t3tris/sdk/curate";
import { createPublicClient, createWalletClient, custom, encodeAbiParameters } from "viem";

const assert = (ok, msg) => {
  if (!ok) {
    console.error(\`assert failed: \${msg}\`);
    process.exit(1);
  }
};

assert(typeof createT3trisClient === "function", "createT3trisClient export");
assert(typeof SDK_VERSION === "string" && SDK_VERSION.length > 0, "SDK_VERSION export");
assert(wallet.execute === undefined, "no implicit workflow executor");
assert(VAULT_SETTLE_ROLE !== undefined, "protocol role constants export");
assert(Object.keys(wallet).length > 0, "onchain exports");
assert(compatibleWallet.ChainMismatchError === wallet.ChainMismatchError, "shared wallet error constructor");
assert(compatibleConstants.VAULT_SETTLE_ROLE === VAULT_SETTLE_ROLE, "shared role constant");

delete process.env.T3TRIS_API_URL;
const urls = [];
const client = createT3trisClient({
  apiKey: "sk_smoke",
  fetch: async (url) => {
    urls.push(String(url));
    return Response.json({ items: [] });
  },
});
await client.catalog.listChains();
assert(urls[0] === "https://api.t3tris.finance/v1/chains", "default production origin");
for (const ns of ["catalog", "billing", "vaults", "accounts", "events", "keys", "auth"]) {
  assert(typeof client[ns] === "object", \`client.\${ns} namespace\`);
}
assert(typeof client.billing.getPricing === "function", "client.billing.getPricing");
assert(typeof client.billing.getUsage === "function", "client.billing.getUsage");
assert(typeof client.vaults.get === "function", "client.vaults.get");
const account = "0x1111111111111111111111111111111111111111";
const asset = "0x2222222222222222222222222222222222222222";
const methods = [];
const provider = { request: async ({ method }) => {
  methods.push(method);
  if (method === "eth_chainId") return "0xa4b1";
  if (method === "eth_call") return encodeAbiParameters([{ type: "address" }], [asset]);
  throw new Error("Unexpected wallet request: " + method);
} };
const transport = custom(provider);
const connected = createT3trisClient({
  walletClient: createWalletClient({ account, transport }),
  publicClient: createPublicClient({ transport }),
});
const raw = createT3trisClient({ provider, account });
assert(methods.length === 0, "constructors must not connect or perform IO");
for (const walletClient of [connected, raw]) {
  assert(typeof walletClient.vaults.create === "function", "wallet capability selected");
  assert(!("catalog" in walletClient), "wallet mode is not API mode");
  const result = await walletClient.vaults.read.asset({ chainId: 42161, address: account });
  assert(result.toLowerCase() === asset.toLowerCase(), "packaged wallet read without API URL");
}
console.log("node runtime ok");
`,
);
run(["node", "main.mjs"], nodeDir, "node: import all subpaths");

// 2. Types: subpaths resolve under NodeNext and Bundler resolution.
const typesDir = makeFixture("types");
writeFileSync(
  join(typesDir, "index.ts"),
  `import {
  createT3trisClient,
  type BillingPricing,
  type Page,
  type T3trisClient,
  type UsageSummary,
  type Vault,
} from "@t3tris/sdk";
import type { Address, StreamEvent } from "@t3tris/sdk/entities";
import type { T3trisWalletClient, T3trisWalletOptions } from "@t3tris/sdk";
import type * as wallet from "@t3tris/sdk/onchain";

const client: T3trisClient = createT3trisClient();
const page: Promise<Page<Vault>> = client.vaults.list();
const usage: Promise<UsageSummary> = client.billing.getUsage();
const pricing: Promise<BillingPricing> = client.billing.getPricing();
// @ts-expect-error Email credentials are not part of the public SDK
const credentials: import("@t3tris/sdk").EmailRegisterInput = {};
// @ts-expect-error Email login is not a public SDK capability
client.auth.loginEmail({ email: "test@example.com", password: "example" });
// @ts-expect-error Email registration is not a public SDK capability
client.auth.registerEmail({ email: "test@example.com", password: "example" });
void credentials;
const attached: Promise<Page<Vault>> = client.keys.listVaults({ limit: 100, cursor: "opaque" });
declare const connected: T3trisWalletClient;
const preview: Promise<import("@t3tris/sdk").SettlePreview> = connected.vaults.read.previewSettleAll({chainId: 42161, address: "0x0000000000000000000000000000000000000001"});
// @ts-expect-error fullClaim is exclusive to redemption settlement
connected.vaults.settle({chainId: 42161, address: "0x0000000000000000000000000000000000000001", kind: "both", fullClaim: true});
// @ts-expect-error feeClaimType is not a redemption option
connected.vaults.settle({chainId: 42161, address: "0x0000000000000000000000000000000000000001", kind: "redemptions", feeClaimType: 0});
declare const sharedRef: import("@t3tris/sdk").VaultRef;
connected.vaults.read.isOpen(sharedRef);
declare const rawAmount: bigint;
connected.vaults.deposit({ ...sharedRef, amount: rawAmount });
connected.roles.read.defaultAdminRole(sharedRef);
// @ts-expect-error vault targets use address, not vault
connected.vaults.read.isOpen({ chainId: 42161, vault: sharedRef.address });
void [attached, preview];
const address: Address = "0x0000000000000000000000000000000000000001";
const event: StreamEvent | null = null;
const curate: T3trisWalletClient | null = null;
const clients: T3trisWalletOptions | null = null;
type WalletModule = typeof wallet;
void [page, usage, pricing, address, event, curate, clients];
void (null as unknown as WalletModule | null);
`,
);
for (const resolution of ["NodeNext", "Bundler"]) {
  writeFileSync(
    join(typesDir, `tsconfig.${resolution.toLowerCase()}.json`),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["index.ts"],
      },
      null,
      2,
    )}\n`,
  );
  run(
    ["bun", "x", "tsc", "-p", join(typesDir, `tsconfig.${resolution.toLowerCase()}.json`)],
    pkgDir,
    `types: ${resolution} resolution`,
  );
}

// 3. Browser bundler: neutral helpers bundle for a browser target.
const browserDir = makeFixture("browser");
writeFileSync(
  join(browserDir, "entry.ts"),
  `export { createT3trisClient } from "@t3tris/sdk";
export { VAULT_SETTLE_ROLE } from "@t3tris/sdk/onchain";
export * as wallet from "@t3tris/sdk/onchain";
`,
);
const bundle = await Bun.build({
  entrypoints: [join(browserDir, "entry.ts")],
  outdir: join(browserDir, "dist"),
  format: "esm",
  target: "browser",
});
if (!bundle.success) {
  for (const log of bundle.logs) console.error(log);
  process.exit(1);
}
console.log("ok: browser bundle");

console.log("smoke ok");
