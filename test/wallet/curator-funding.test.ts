import { describe, expect, test } from "bun:test";
import { type Address, decodeAbiParameters, encodeAbiParameters, type Hex, maxUint256 } from "viem";
import { erc20, permit2Table } from "../../src/wallet/calls";
import {
  type EnginePublicClient,
  type EngineWalletClient,
  execute,
  type Step,
} from "../../src/wallet/engine";
import { PERMIT2_ADDRESS } from "../../src/wallet/permit2";

const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const CURATOR = "0x2222222222222222222222222222222222222222" as Address;
const SAFE = "0x3333333333333333333333333333333333333333" as Address;
const VAULT = "0x4444444444444444444444444444444444444444" as Address;
const HASH = `0x${"11".repeat(32)}` as Hex;
const AMOUNT = 10n;

function setup({
  safe = false,
  nativeAllowance = 0n,
  permit2Allowance = 0n,
  signingFails = false,
  permitSimulationFails = false,
  rejectSettlement = false,
  rejectPreflight = false,
}: {
  safe?: boolean;
  nativeAllowance?: bigint;
  permit2Allowance?: bigint;
  signingFails?: boolean;
  permitSimulationFails?: boolean;
  rejectSettlement?: boolean;
  rejectPreflight?: boolean;
}) {
  const account = safe ? SAFE : CURATOR;
  let native = nativeAllowance;
  let permit2 = permit2Allowance;
  let lastApproval: Address | undefined;
  const calls: string[] = [];
  const sent: Address[] = [];
  const walletClient: EngineWalletClient = {
    account: { address: account },
    getChainId: async () => 42161,
    switchChain: async () => undefined,
    signTypedData: async ({ account: signer, message }) => {
      calls.push("sign");
      expect(signer).toBe(account);
      expect(message).toMatchObject({ spender: VAULT, details: { token: TOKEN, amount: AMOUNT } });
      if (signingFails) throw new Error("signature unavailable");
      return "0x1234";
    },
    sendTransaction: async ({ to, data }) => {
      sent.push(to);
      if (to === TOKEN) {
        calls.push("approve");
        const [spender, value] = decodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }],
          `0x${data.slice(10)}`,
        );
        expect(value).toBe(maxUint256);
        lastApproval = spender;
      } else {
        calls.push("settle");
        if (rejectSettlement) throw { code: 4001, message: "User rejected the request." };
      }
      return HASH;
    },
  };
  const publicClient: EnginePublicClient = {
    call: async ({ to, data }) => {
      if (to === TOKEN && data.startsWith(erc20.allowance.sel)) {
        const [, spender] = decodeAbiParameters(
          [{ type: "address" }, { type: "address" }],
          `0x${data.slice(10)}`,
        );
        return {
          data: encodeAbiParameters([{ type: "uint256" }], [spender === VAULT ? native : permit2]),
        };
      }
      if (to === VAULT && rejectPreflight) {
        throw { code: 4001, message: "User rejected the request." };
      }
      if (to === VAULT && data !== "0x" && permitSimulationFails) {
        throw new Error("Invalid contract signature");
      }
      if (to === PERMIT2_ADDRESS && data.startsWith(permit2Table.allowance.sel)) {
        return {
          data: encodeAbiParameters(
            [{ type: "uint160" }, { type: "uint48" }, { type: "uint48" }],
            [0n, 0, 0],
          ),
        };
      }
      return { data: "0x" };
    },
    getCode: async () => (safe ? "0x6000" : "0x"),
    getBlock: async () => ({ timestamp: 1_000n }),
    waitForTransactionReceipt: async () => {
      if (lastApproval === VAULT) native = maxUint256;
      if (lastApproval === PERMIT2_ADDRESS) permit2 = maxUint256;
      lastApproval = undefined;
      return { status: "success", blockNumber: 1n, transactionHash: HASH };
    },
  };
  const steps: Step[] = [
    { kind: "requireChain", chainId: 42161 },
    {
      kind: "fundCurator",
      id: "curator",
      build: async () => ({
        token: TOKEN,
        curator: account,
        vault: VAULT,
        amount: AMOUNT,
        chainId: 42161,
      }),
    },
    { kind: "tx", to: VAULT, data: (ctx) => ctx.fundingPayload("curator") },
  ];
  return { walletClient, publicClient, steps, calls, sent };
}

describe("curator funding", () => {
  test("uses an existing native vault allowance without another approval or signature", async () => {
    const fixture = setup({ nativeAllowance: AMOUNT });
    await execute(fixture.steps, fixture);
    expect(fixture.calls).toEqual(["settle"]);
  });

  test("approves Permit2, signs the exact amount, then submits", async () => {
    const fixture = setup({});
    await execute(fixture.steps, fixture);
    expect(fixture.calls).toEqual(["approve", "sign", "settle"]);
    expect(fixture.sent).toEqual([TOKEN, VAULT]);
  });

  test("falls back to a native approval when signing fails", async () => {
    const fixture = setup({ permit2Allowance: AMOUNT, signingFails: true });
    await execute(fixture.steps, fixture);
    expect(fixture.calls).toEqual(["sign", "approve", "settle"]);
    expect(fixture.sent).toEqual([TOKEN, VAULT]);
  });

  test("falls back to native when an EOA Permit2 simulation fails", async () => {
    const fixture = setup({ permit2Allowance: AMOUNT, permitSimulationFails: true });
    await execute(fixture.steps, fixture);
    expect(fixture.calls).toEqual(["sign", "approve", "settle"]);
    expect(fixture.sent).toEqual([TOKEN, VAULT]);
  });

  test("stops on a Safe approval proposal and never signs or settles prematurely", async () => {
    const fixture = setup({ safe: true });
    const result = await execute(fixture.steps, fixture);
    expect(result.status).toBe("proposed");
    expect(fixture.calls).toEqual(["approve"]);
  });

  test("uses a Safe EIP-1271 signature when Permit2 is approved and preflight succeeds", async () => {
    const fixture = setup({ safe: true, permit2Allowance: AMOUNT });
    const result = await execute(fixture.steps, fixture);
    expect(result.status).toBe("proposed");
    expect(fixture.calls).toEqual(["sign", "settle"]);
    expect(fixture.sent).toEqual([VAULT]);
  });

  test("falls back to a native Safe approval proposal when contract signing fails", async () => {
    const fixture = setup({ safe: true, permit2Allowance: AMOUNT, signingFails: true });
    const result = await execute(fixture.steps, fixture);
    expect(result.status).toBe("proposed");
    expect(fixture.calls).toEqual(["sign", "approve"]);
    expect(fixture.sent).toEqual([TOKEN]);
  });

  test("falls back to native when a Safe's signed Permit2 simulation is rejected", async () => {
    const fixture = setup({ safe: true, permit2Allowance: AMOUNT, permitSimulationFails: true });
    const result = await execute(fixture.steps, fixture);
    expect(result.status).toBe("proposed");
    expect(fixture.calls).toEqual(["sign", "approve"]);
    expect(fixture.sent).toEqual([TOKEN]);
  });

  test("proposes settlement directly after the Safe's native approval executes", async () => {
    const fixture = setup({ safe: true, nativeAllowance: AMOUNT, signingFails: true });
    const result = await execute(fixture.steps, fixture);
    expect(result.status).toBe("proposed");
    expect(fixture.calls).toEqual(["settle"]);
    expect(fixture.sent).toEqual([VAULT]);
  });

  test("does not propose native approval after rejecting the settlement send", async () => {
    const fixture = setup({ permit2Allowance: AMOUNT, rejectSettlement: true });
    await expect(execute(fixture.steps, fixture)).rejects.toMatchObject({
      name: "ActionCancelledError",
    });
    expect(fixture.calls).toEqual(["sign", "settle"]);
  });

  test("does not fall back to approval when the preflight itself is rejected", async () => {
    const fixture = setup({ permit2Allowance: AMOUNT, rejectPreflight: true });
    await expect(execute(fixture.steps, fixture)).rejects.toMatchObject({
      name: "ActionCancelledError",
    });
    expect(fixture.calls).toEqual(["sign"]);
  });

  test("does not request any approval or signature for a zero funding quote", async () => {
    const fixture = setup({});
    const steps = fixture.steps.map(
      (step): Step =>
        step.kind === "fundCurator"
          ? {
              ...step,
              build: async () => ({
                token: TOKEN,
                curator: CURATOR,
                vault: VAULT,
                amount: 0n,
                chainId: 42161,
              }),
            }
          : step,
    );
    await execute(steps, fixture);
    expect(fixture.calls).toEqual(["settle"]);
  });

  test("does not sign for the curator from another operator's wallet", async () => {
    const fixture = setup({});
    fixture.walletClient.account = { address: SAFE };
    await expect(execute(fixture.steps, fixture)).rejects.toThrow("Connect the curator wallet");
    expect(fixture.calls).toEqual([]);
  });
});
