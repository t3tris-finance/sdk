import { describe, expect, test } from "bun:test";
import type { Address, Hex } from "viem";
import { bindEngineClients } from "../src/wallet/provider";

const account = "0x0000000000000000000000000000000000000001" as Address;
const hash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

describe("bindEngineClients", () => {
  test("forwards the caller's wallet client", async () => {
    const calls: string[] = [];
    const clients = bindEngineClients({
      walletClient: {
        account: { address: account },
        getChainId: async () => 42161,
        switchChain: async ({ id }) => {
          calls.push(`switch:${id}`);
        },
        sendTransaction: async () => {
          calls.push("send");
          return hash;
        },
        signTypedData: async () => {
          calls.push("sign");
          return hash;
        },
      },
      publicClient: {
        call: async () => ({ data: "0x" as Hex }),
        getCode: async () => "0x" as Hex,
        getBlock: async () => ({ timestamp: 1n }),
        waitForTransactionReceipt: async () => ({
          status: "success" as const,
          blockNumber: 1n,
          transactionHash: hash,
        }),
      },
    });

    expect(clients.walletClient.account?.address).toBe(account);
    await clients.walletClient.switchChain({ id: 4663 });
    expect(await clients.walletClient.sendTransaction({ to: account, data: "0x" })).toBe(hash);
    expect(calls).toEqual(["switch:4663", "send"]);
    expect((await clients.publicClient.call({ to: account, data: "0x" })).data).toBe("0x");
  });
});
