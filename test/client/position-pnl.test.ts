import { expect, test } from "bun:test";
import { createT3trisClient } from "../../src";

test("position PnL is a server-side API read scoped to wallet, chain and vault", async () => {
  let url = "";
  const address = "0x1111111111111111111111111111111111111111";
  const vault = "0x2222222222222222222222222222222222222222";
  const fetcher: typeof fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      url = String(input);
      return Response.json({
        chainId: 42161,
        vaultAddress: vault,
        ownerAddress: address,
        points: [],
      });
    },
    { preconnect: fetch.preconnect },
  );
  const client = createT3trisClient({
    baseUrl: "https://example.test",
    apiKey: "sk_test",
    fetch: fetcher,
  });
  expect(
    await client.accounts.getPositionPnl({ address, vault: { chainId: 42161, address: vault } }),
  ).toEqual({ chainId: 42161, vaultAddress: vault, ownerAddress: address, points: [] });
  expect(url).toBe(`https://example.test/v0/accounts/${address}/pnl/42161/${vault}`);
});
