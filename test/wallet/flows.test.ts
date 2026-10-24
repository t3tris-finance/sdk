import { describe, expect, test } from "bun:test";
import { type Address, decodeAbiParameters, encodeAbiParameters, type Hex } from "viem";
import { earn } from "../../src/wallet/calls";
import type { EnginePublicClient, EngineWalletClient, Step } from "../../src/wallet/engine";
import { decreaseDepositSteps, depositSteps, requestDepositSteps } from "../../src/wallet/flows";
import { PERMIT2_ADDRESS } from "../../src/wallet/permit2";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const VAULT = "0x2222222222222222222222222222222222222222" as Address;
const ASSET = "0x3333333333333333333333333333333333333333" as Address;
const HASH = `0x${"11".repeat(32)}` as Hex;

function ctx(): {
  walletClient: EngineWalletClient;
  publicClient: EnginePublicClient;
  chainId: number;
} {
  const walletClient: EngineWalletClient = {
    account: { address: ACCOUNT },
    getChainId: async () => 42161,
    switchChain: async () => undefined,
    sendTransaction: async () => HASH,
    signTypedData: async () => "0x",
  };
  const publicClient: EnginePublicClient = {
    call: async (args) => {
      if (args.data.startsWith(earn.underlying.sel)) {
        return { data: encodeAbiParameters([{ type: "address" }], [ASSET]) };
      }
      return { data: "0x" };
    },
    getCode: async () => "0x",
    getBlock: async () => ({ timestamp: 1n }),
    waitForTransactionReceipt: async () => ({
      status: "success",
      blockNumber: 1n,
      transactionHash: HASH,
    }),
  };
  return { walletClient, publicClient, chainId: 42161 };
}

function allowanceStep(steps: readonly Step[]) {
  const step = steps.find((item) => item.kind === "requireAllowance");
  if (step === undefined || step.kind !== "requireAllowance") {
    throw new Error("missing allowance step");
  }
  return step;
}

function staticTxData(steps: readonly Step[]): Hex {
  const step = steps.find((item) => item.kind === "tx");
  if (step === undefined || step.kind !== "tx" || typeof step.data !== "string") {
    throw new Error("expected static tx data");
  }
  return step.data;
}

describe("decreaseDepositSteps", () => {
  test("defaults minAmountOut to zero slippage", async () => {
    const steps = await decreaseDepositSteps(ctx(), { vault: VAULT, amount: 100n });
    const data = staticTxData(steps);
    expect(data.startsWith(earn.decreaseDepositRequest.sel)).toBe(true);
    const decoded = decodeAbiParameters(
      [{ type: "address" }, { type: "bool" }, { type: "uint256" }, { type: "uint256" }],
      `0x${data.slice(10)}` as Hex,
    );
    expect(decoded[0]).toBe(ACCOUNT);
    expect(decoded[1]).toBe(false);
    expect(decoded[2]).toBe(100n);
    expect(decoded[3]).toBe(0n);
  });

  test("encodes a caller-supplied minAmountOut floor", async () => {
    const steps = await decreaseDepositSteps(ctx(), {
      vault: VAULT,
      amount: 100n,
      receiver: ASSET,
      minAmountOut: 90n,
    });
    const data = staticTxData(steps);
    const decoded = decodeAbiParameters(
      [{ type: "address" }, { type: "bool" }, { type: "uint256" }, { type: "uint256" }],
      `0x${data.slice(10)}` as Hex,
    );
    expect(decoded[0]).toBe(ASSET);
    expect(decoded[3]).toBe(90n);
  });
});

describe("deposit funding approval", () => {
  test("depositSteps defaults to an unlimited Permit2 approval", async () => {
    const steps = await depositSteps(ctx(), { vault: VAULT, amount: 100n });
    const allowance = allowanceStep(steps);
    expect(allowance.token).toBe(ASSET);
    expect(allowance.spender).toBe(PERMIT2_ADDRESS);
    expect(allowance.amount).toBe(100n);
    expect(allowance.approveAmount).toBe("max");
  });

  test("requestDepositSteps keeps the same unlimited approval default", async () => {
    const steps = await requestDepositSteps(ctx(), { vault: VAULT, amount: 40n });
    const allowance = allowanceStep(steps);
    expect(allowance.spender).toBe(PERMIT2_ADDRESS);
    expect(allowance.approveAmount).toBe("max");
    expect(allowance.amount).toBe(40n);
  });

  test("a finite native approval spends the vault, not Permit2", async () => {
    const steps = await depositSteps(ctx(), {
      vault: VAULT,
      amount: 100n,
      strategy: "native",
      approveAmount: 100n,
    });
    const allowance = allowanceStep(steps);
    expect(allowance.spender).toBe(VAULT);
    expect(allowance.approveAmount).toBe(100n);
  });
});
