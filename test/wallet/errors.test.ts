import { describe, expect, test } from "bun:test";
import { errorCodeOf } from "../../src/wallet/errors";

describe("errorCodeOf", () => {
  test("decodes the vault stale-valuation revert", () => {
    expect(errorCodeOf("0xe0a39b14")).toBe("E_VAULT_STALE_VALUATION");
  });

  test("matches selectors case-insensitively and passes unknown ones through", () => {
    expect(errorCodeOf("0xE0A39B14")).toBe("E_VAULT_STALE_VALUATION");
    expect(errorCodeOf("0xdeadbeef")).toBeUndefined();
  });
});
