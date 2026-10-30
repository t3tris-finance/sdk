import { describe, expect, test } from "bun:test";
import pkg from "../package.json";
import * as root from "../src";
import * as constants from "../src/compat/curate";
import * as wallet from "../src/compat/wallet";
import * as onchain from "../src/onchain";

describe("public SDK surface", () => {
  test("one constructor and no implicit workflow entry points", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual([
      ".",
      "./curate",
      "./entities",
      "./onchain",
      "./wallet",
    ]);
    expect(root.SDK_VERSION).toBe(pkg.version);
    expect(typeof root.createT3trisClient).toBe("function");
    for (const exports of [root, constants, wallet, onchain]) {
      for (const name of Object.keys(exports)) {
        expect(name).not.toMatch(
          /Steps$|^execute$|^createCurate$|^bindEngineClients$|^createEngineClients$|^make.*Actions$/,
        );
      }
    }
    expect(constants.VAULT_SETTLE_ROLE).toMatch(/^0x/);
    for (const [name, value] of Object.entries(constants)) {
      expect(onchain[name as keyof typeof onchain]).toBe(value);
    }
    for (const [name, value] of Object.entries(wallet)) {
      expect(onchain[name as keyof typeof onchain]).toBe(value);
    }
    expect(onchain.ChainMismatchError).toBe(root.ChainMismatchError);
    expect(onchain.PlatformActionError).toBe(root.PlatformActionError);
  });
});
