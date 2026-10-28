import { describe, expect, test } from "bun:test";
import pkg from "../package.json";
import * as root from "../src";
import * as constants from "../src/curate";
import * as wallet from "../src/wallet";

describe("public SDK surface", () => {
  test("one constructor and no implicit workflow entry points", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual([".", "./curate", "./entities", "./wallet"]);
    expect(root.SDK_VERSION).toBe(pkg.version);
    expect(typeof root.createT3trisClient).toBe("function");
    for (const exports of [root, constants, wallet]) {
      for (const name of Object.keys(exports)) {
        expect(name).not.toMatch(
          /Steps$|^execute$|^createCurate$|^bindEngineClients$|^createEngineClients$|^make.*Actions$/,
        );
      }
    }
    expect(constants.VAULT_SETTLE_ROLE).toMatch(/^0x/);
  });
});
