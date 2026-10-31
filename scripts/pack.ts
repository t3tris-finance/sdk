/**
 * Stage the package in `.pack/` (gitignored) and produce a tarball with
 * `npm pack`. Exports point at built `dist/`. The repository manifest keeps
 * source exports so tests and examples typecheck without a build.
 *
 * The staged manifest stays `private` and has no `license` field. Publishing
 * is disabled until a maintainer adds the license text and flips the gates
 * in README.md. Do not `npm publish` this tarball before that.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkgDir = join(import.meta.dir, "..");
const stageDir = join(pkgDir, ".pack");

const build = Bun.spawnSync(["bun", "scripts/build.ts"], {
  cwd: pkgDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (build.exitCode !== 0) process.exit(build.exitCode);

const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
  name: string;
  version: string;
  description?: string;
  dependencies: Record<string, string>;
};
const { SDK_VERSION } = await import("../dist/index.js");
if (SDK_VERSION !== manifest.version) {
  console.error(`SDK_VERSION (${SDK_VERSION}) != version (${manifest.version})`);
  process.exit(1);
}

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });
cpSync(join(pkgDir, "dist"), join(stageDir, "dist"), { recursive: true });
cpSync(join(pkgDir, "CHANGELOG.md"), join(stageDir, "CHANGELOG.md"));
// Published README stops before maintainer-only packaging notes.
const readme = readFileSync(join(pkgDir, "README.md"), "utf8");
const maintainer = readme.indexOf("\n## Packaging (maintainers)\n");
const publishedReadme = maintainer === -1 ? readme : readme.slice(0, maintainer);
writeFileSync(join(stageDir, "README.md"), `${publishedReadme.trimEnd()}\n`);

const repoUrl = "https://github.com/t3tris-finance/sdk";
const publishManifest = {
  name: manifest.name,
  version: manifest.version,
  description:
    manifest.description ??
    "Typed client for the T3tris API (/v1) plus the on-chain action engine.",
  // Stay private until LICENSE exists and publishing is explicitly enabled.
  private: true,
  type: "module",
  exports: {
    ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
    "./entities": { types: "./dist/entities/index.d.ts", default: "./dist/entities/index.js" },
    "./onchain": { types: "./dist/onchain/index.d.ts", default: "./dist/onchain/index.js" },
    "./curate": { types: "./dist/compat/curate.d.ts", default: "./dist/compat/curate.js" },
    "./wallet": { types: "./dist/compat/wallet.d.ts", default: "./dist/compat/wallet.js" },
    "./package.json": "./package.json",
  },
  files: ["dist", "CHANGELOG.md"],
  sideEffects: false,
  engines: { node: ">=22" },
  repository: {
    type: "git",
    url: `git+${repoUrl}.git`,
  },
  homepage: `${repoUrl}#readme`,
  bugs: { url: `${repoUrl}/issues` },
  dependencies: manifest.dependencies,
};
writeFileSync(join(stageDir, "package.json"), `${JSON.stringify(publishManifest, null, 2)}\n`);

const pack = Bun.spawnSync(["npm", "pack"], {
  cwd: stageDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (pack.exitCode !== 0) process.exit(pack.exitCode);
console.log(`staged ${stageDir} -> t3tris-sdk-${manifest.version}.tgz`);
