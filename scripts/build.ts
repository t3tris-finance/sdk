/**
 * Build the publishable distribution into `dist/` (gitignored): one bundled ESM
 * file per public subpath plus the full declaration tree. Workspace consumers
 * keep resolving `src/` via the repo manifest — `dist/` is only used by the
 * staged publish package (see `pack.ts`).
 */
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const pkgDir = join(import.meta.dir, "..");
const distDir = join(pkgDir, "dist");

rmSync(distDir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [
    join(pkgDir, "src/index.ts"),
    join(pkgDir, "src/entities/index.ts"),
    join(pkgDir, "src/curate/index.ts"),
    join(pkgDir, "src/wallet/index.ts"),
  ],
  outdir: distDir,
  format: "esm",
  target: "browser",
  external: ["viem", "viem/*"],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const tsc = Bun.spawnSync(["bun", "x", "tsc", "-p", "tsconfig.build.json"], {
  cwd: pkgDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (tsc.exitCode !== 0) process.exit(tsc.exitCode);

// tsc emits extensionless relative specifiers; rewrite them so the published
// declarations also resolve for consumers on NodeNext resolution.
function rewriteDeclarationSpecifiers(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      rewriteDeclarationSpecifiers(path);
      continue;
    }
    if (!path.endsWith(".d.ts")) continue;
    const source = readFileSync(path, "utf8");
    const rewritten = source.replace(
      /(\bfrom|\bimport\s*\()\s*"(\.[^"]*)"/g,
      (match, prefix: string, specifier: string) => {
        if (/\.(js|json)$/.test(specifier)) return match;
        const base = join(dirname(path), specifier);
        let resolved: string | undefined;
        try {
          if (statSync(`${base}.d.ts`).isFile()) resolved = `${specifier}.js`;
        } catch {}
        if (!resolved) {
          try {
            if (statSync(join(base, "index.d.ts")).isFile()) resolved = `${specifier}/index.js`;
          } catch {}
        }
        if (!resolved) return match;
        return `${prefix}${prefix === "from" ? " " : ""}"${resolved}"`;
      },
    );
    if (rewritten !== source) writeFileSync(path, rewritten);
  }
}

rewriteDeclarationSpecifiers(distDir);
console.log(`built ${result.outputs.length} entrypoints -> dist/`);
