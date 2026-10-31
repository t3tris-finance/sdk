import { expect, test } from "bun:test";
import { createT3trisClient } from "../../src";

const ref = { chainId: 42161, address: "0x1111111111111111111111111111111111111111" as const };
test("organization key operations forward targets, batches and creation without hierarchy", async () => {
  const requests: { url: URL; body: unknown; method: string }[] = [];
  const client = createT3trisClient({
    apiKey: "sk_manager",
    fetch: async (url, init) => {
      requests.push({
        url: new URL(String(url)),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        method: init?.method ?? "GET",
      });
      return Response.json({ id: "12", secret: "sk_once" });
    },
  });
  expect(await client.keys.create({ name: "customer", scopes: ["public", "stream"] })).toEqual({
    id: "12",
    secret: "sk_once",
  });
  await client.keys.attachVault({ keyId: "12", vaults: [ref, ref] });
  await client.keys.detachVault({ keyId: "12", vaults: [ref] });
  await client.keys.listVaults({ keyId: "12", limit: 2 });
  expect(requests[0]?.url.pathname).toBe("/v0/key/keys");
  expect(requests[1]?.body).toEqual({ keyId: "12", vaults: [ref, ref] });
  expect(requests[2]?.method).toBe("DELETE");
  expect(requests[3]?.url.searchParams.get("keyId")).toBe("12");
  expect("lookupVaults" in client.keys).toBe(false);
});
test("hasVaults preserves booleans and duplicate order, bounds IO", async () => {
  let calls = 0;
  const client = createT3trisClient({
    fetch: async () => {
      calls++;
      return Response.json([true, false, true]);
    },
  });
  expect(await client.keys.hasVaults([])).toEqual([]);
  expect(() => client.keys.hasVaults(Array.from({ length: 101 }, () => ref))).toThrow(
    "at most 100",
  );
  expect(calls).toBe(0);
  expect(await client.keys.hasVaults([ref, { ...ref, chainId: 1 }, ref])).toEqual([
    true,
    false,
    true,
  ]);
  expect(calls).toBe(1);
});
