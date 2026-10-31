import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const pkgDir = join(import.meta.dir, "..");
const distDir = join(pkgDir, "dist");
rmSync(distDir, { recursive: true, force: true });
const result = Bun.spawnSync(["bun", "x", "tsc", "-p", "tsconfig.build.json"], {
  cwd: pkgDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (result.exitCode !== 0) process.exit(result.exitCode);

// Preserve modules: all entry points share error classes and tree-shake correctly.
function rewriteSpecifiers(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      rewriteSpecifiers(path);
      continue;
    }
    if (!path.endsWith(".js") && !path.endsWith(".d.ts")) continue;
    const source = readFileSync(path, "utf8");
    const rewritten = source.replace(
      /(\bfrom|\bimport\s*\()\s*"(\.[^"]*)"/g,
      (match, prefix: string, specifier: string) => {
        if (/\.(js|json)$/.test(specifier)) return match;
        const base = join(dirname(path), specifier);
        let resolved: string | undefined;
        try {
          if (statSync(`${base}.js`).isFile()) resolved = `${specifier}.js`;
        } catch {}
        if (!resolved) {
          try {
            if (statSync(join(base, "index.js")).isFile()) resolved = `${specifier}/index.js`;
          } catch {}
        }
        return resolved ? `${prefix}${prefix === "from" ? " " : ""}"${resolved}"` : match;
      },
    );
    if (rewritten !== source) writeFileSync(path, rewritten);
  }
}
rewriteSpecifiers(distDir);
