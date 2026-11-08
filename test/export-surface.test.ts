import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import pkg from "../package.json";
import * as root from "../src";
import * as onchain from "../src/onchain";

describe("public SDK surface", () => {
  test("source checkout has one constructor, explicit entry points and no compatibility shims", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.exports).toEqual({
      ".": "./src/index.ts",
      "./onchain": "./src/onchain/index.ts",
      "./entities": "./src/entities/index.ts",
      "./package.json": "./package.json",
    });
    expect(existsSync(new URL("../src/compat", import.meta.url))).toBe(false);
    expect(root.SDK_VERSION).toBe(pkg.version);
    expect(typeof root.createT3trisClient).toBe("function");
    for (const exports of [root, onchain]) {
      for (const name of Object.keys(exports)) {
        expect(name).not.toMatch(
          /Steps$|^execute$|^createCurate$|^bindEngineClients$|^createEngineClients$|^make.*Actions$/,
        );
      }
    }
    expect(onchain.VAULT_SETTLE_ROLE).toMatch(/^0x/);
    expect(onchain.ChainMismatchError).toBe(root.ChainMismatchError);
    expect(onchain.PlatformActionError).toBe(root.PlatformActionError);
  });
});
