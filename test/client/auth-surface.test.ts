import { expect, test } from "bun:test";
import { createT3trisClient } from "../../src";

test("public authentication is wallet-only, with session lifecycle methods", () => {
  const client = createT3trisClient();
  expect(Object.keys(client.auth).sort()).toEqual([
    "createSiweNonce",
    "logout",
    "logoutAll",
    "verifySiwe",
    "whoami",
  ]);
  expect("loginEmail" in client.auth).toBe(false);
  expect("registerEmail" in client.auth).toBe(false);
});
