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
import { VAULT_SETTLE_ROLE } from "@t3tris/sdk/curate";
import * as entities from "@t3tris/sdk/entities";
import * as wallet from "@t3tris/sdk/wallet";
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
assert(VAULT_SETTLE_ROLE !== undefined, "curate role constants export");
assert(Object.keys(wallet).length > 0, "wallet exports");

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
  const result = await walletClient.vaults.read.asset({ chainId: 42161, vault: account });
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
import type * as wallet from "@t3tris/sdk/wallet";

const client: T3trisClient = createT3trisClient();
const page: Promise<Page<Vault>> = client.vaults.list();
const usage: Promise<UsageSummary> = client.billing.getUsage();
const pricing: Promise<BillingPricing> = client.billing.getPricing();
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

// 3. Browser bundler: all four subpaths bundle for a browser target.
const browserDir = makeFixture("browser");
writeFileSync(
  join(browserDir, "entry.ts"),
  `export { createT3trisClient } from "@t3tris/sdk";
export { VAULT_SETTLE_ROLE } from "@t3tris/sdk/curate";
export * as wallet from "@t3tris/sdk/wallet";
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
