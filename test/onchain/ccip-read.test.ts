import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
  encodeAbiParameters,
  encodeErrorResult,
  type Hex,
  parseAbi,
} from "viem";
import { createT3trisClient } from "../../src";

const account = "0x1111111111111111111111111111111111111111" as const;
const token = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"ab".repeat(32)}` as Hex;
const callback = "0x12345678";
const offchainLookup = encodeErrorResult({
  abi: parseAbi([
    "error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData)",
  ]),
  errorName: "OffchainLookup",
  args: [token, ["http://127.0.0.1:9/sdk-ccip-proof?data={data}"], "0xabcd", callback, "0x"],
});

function fixture(mode: "provider" | "injected", revert: boolean) {
  const methods: string[] = [];
  const calls: { to: string; data: string }[] = [];
  const sent: { from: string; to: string; data: string }[] = [];
  const provider = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      methods.push(method);
      if (methods.length > 20) throw new Error("Bounded fake RPC provider");
      if (method === "eth_chainId") return "0xa4b1";
      if (method === "eth_accounts") return [account];
      if (method === "eth_getCode") return "0x";
      if (method === "eth_call") {
        const call = params?.[0] as (typeof calls)[number];
        calls.push(call);
        if (call.data.startsWith(callback)) {
          return encodeAbiParameters([{ type: "uint256" }], [999n]);
        }
        if (revert) {
          throw Object.assign(new Error("execution reverted"), { code: 3, data: offchainLookup });
        }
        return encodeAbiParameters([{ type: "uint256" }], [23n]);
      }
      if (method === "eth_sendTransaction") {
        sent.push(params?.[0] as (typeof sent)[number]);
        return hash;
      }
      throw new Error(`Forbidden fake provider operation: ${method}`);
    },
  } as EIP1193Provider;
  const transport = custom(provider);
  const publicClient = createPublicClient({ transport, ccipRead: false });
  const client =
    mode === "provider"
      ? createT3trisClient({ provider, account })
      : createT3trisClient({
          walletClient: createWalletClient({ account, transport }),
          publicClient,
        });
  return { client, publicClient, methods, calls, sent };
}

describe("on-chain CCIP Read policy", () => {
  const savedFetch = globalThis.fetch;
  let fetchAttempts = 0;
  beforeEach(() => {
    fetchAttempts = 0;
    // Intercept every destination: these tests must never perform real HTTP.
    globalThis.fetch = (async () => {
      fetchAttempts++;
      return new Response(JSON.stringify({ data: "0x" }), {
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = savedFetch;
  });

  for (const mode of ["provider", "injected"] as const) {
    test(`${mode}: OffchainLookup rejects balance reads without any HTTP or callback`, async () => {
      const f = fixture(mode, true);
      await expect(
        f.client.tokens.balanceOf({ chainId: 42161, token, owner: account }),
      ).rejects.toThrow();
      expect(fetchAttempts).toBe(0);
      expect(f.calls.length).toBeGreaterThan(0);
      expect(f.calls.every((call) => call.to === token && call.data.startsWith("0x70a08231"))).toBe(
        true,
      );
      expect(f.sent).toEqual([]);
    });

    test(`${mode}: OffchainLookup rejects transaction simulation without sending`, async () => {
      const f = fixture(mode, true);
      await expect(
        f.client.tokens.approve({ chainId: 42161, token, spender: account, amount: 7n }),
      ).rejects.toThrow();
      expect(fetchAttempts).toBe(0);
      expect(f.calls.length).toBeGreaterThan(0);
      expect(f.calls.every((call) => call.to === token && call.data.startsWith("0x095ea7b3"))).toBe(
        true,
      );
      expect(f.sent).toEqual([]);
    });

    test(`${mode}: ordinary balances and explicit simulate/send remain unchanged`, async () => {
      const f = fixture(mode, false);
      expect(f.methods).toEqual([]);
      expect(await f.client.tokens.balanceOf({ chainId: 42161, token, owner: account })).toBe(23n);
      expect(
        await f.client.tokens.approve({ chainId: 42161, token, spender: account, amount: 7n }),
      ).toEqual({ status: "submitted", hash });
      expect(fetchAttempts).toBe(0);
      expect(f.calls).toHaveLength(2);
      expect(f.sent).toEqual([{ from: account, to: token, data: f.calls[1]?.data }]);
      expect(f.methods.filter((method) => method === "eth_sendTransaction")).toHaveLength(1);
      expect(f.publicClient.ccipRead).toBe(false);
    });
  }
});
