import { describe, expect, test } from "bun:test";
import { type Address, encodeAbiParameters, type Hex, keccak256, toBytes } from "viem";
import { erc20 } from "../../src/wallet/calls";
import {
  type EnginePublicClient,
  type EngineWalletClient,
  execute,
  PlatformActionError,
  type Step,
} from "../../src/wallet/engine";

const OWNER = "0x1111111111111111111111111111111111111111" as Address;
const TOKEN = "0x2222222222222222222222222222222222222222" as Address;
const VAULT = "0x3333333333333333333333333333333333333333" as Address;
const HASH = `0x${"11".repeat(32)}` as Hex;
const SAFE = "0x4444444444444444444444444444444444444444" as Address;

function flow(owner: Address = OWNER): Step[] {
  return [
    { kind: "requireChain", chainId: 42161 },
    { kind: "requireAllowance", token: TOKEN, owner, spender: VAULT, amount: 10n },
    { kind: "tx", to: VAULT, data: "0x12345678" },
  ];
}

function clients(initialAllowance: bigint, safe = false) {
  let allowance = initialAllowance;
  const sent: Address[] = [];
  const walletClient: EngineWalletClient = {
    account: { address: safe ? SAFE : OWNER },
    getChainId: async () => 42161,
    switchChain: async () => undefined,
    sendTransaction: async ({ to }) => {
      sent.push(to);
      return HASH;
    },
    signTypedData: async () => "0x",
  };
  const publicClient: EnginePublicClient = {
    call: async ({ data }) => {
      if (data.startsWith(erc20.allowance.sel)) {
        return { data: encodeAbiParameters([{ type: "uint256" }], [allowance]) };
      }
      return { data: "0x" };
    },
    getCode: async () => (safe ? "0x6000" : "0x"),
    getBlock: async () => ({ timestamp: 1n }),
    waitForTransactionReceipt: async () => {
      allowance = 10n;
      return { status: "success", blockNumber: 1n, transactionHash: HASH };
    },
  };
  return { walletClient, publicClient, sent };
}

describe("write chain gate", () => {
  test("switches before probing account code or simulating a transaction", async () => {
    let chainId = 1;
    const events: string[] = [];
    const walletClient: EngineWalletClient = {
      account: { address: OWNER },
      getChainId: async () => chainId,
      switchChain: async ({ id }) => {
        events.push("switch");
        chainId = id;
      },
      sendTransaction: async () => {
        events.push("send");
        return HASH;
      },
      signTypedData: async () => "0x",
    };
    const publicClient: EnginePublicClient = {
      call: async ({ data }) => {
        events.push("simulate");
        return {
          data: data.startsWith(erc20.allowance.sel)
            ? encodeAbiParameters([{ type: "uint256" }], [10n])
            : "0x",
        };
      },
      getCode: async () => {
        events.push("probe");
        return "0x";
      },
      getBlock: async () => ({ timestamp: 1n }),
      waitForTransactionReceipt: async () => ({
        status: "success",
        blockNumber: 1n,
        transactionHash: HASH,
      }),
    };
    await execute(flow(), { walletClient, publicClient });
    expect(events[0]).toBe("switch");
    expect(events.indexOf("simulate")).toBeGreaterThan(events.indexOf("switch"));
    expect(events.at(-1)).toBe("send");
  });

  test("uses nested revert bytes rather than the connected address in the error message", async () => {
    const { walletClient, publicClient } = clients(10n);
    publicClient.call = async ({ data }) => {
      if (data.startsWith(erc20.allowance.sel)) {
        return { data: encodeAbiParameters([{ type: "uint256" }], [10n]) };
      }
      throw {
        message: `Call from ${OWNER} reverted`,
        cause: { data: { data: "0xd93c0665" } },
      };
    };
    try {
      await execute(flow(), { walletClient, publicClient });
      throw new Error("expected a revert");
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformActionError);
      expect((error as PlatformActionError).selector).toBe("0xd93c0665");
      expect((error as PlatformActionError).revertData).toBe("0xd93c0665");
      expect((error as PlatformActionError).code).toBe("E_ENFORCED_PAUSE");
    }
  });

  test("retains access-control revert arguments for a useful caller message", async () => {
    const { walletClient, publicClient } = clients(10n);
    const role = keccak256(toBytes("ENABLE_WHITELIST_ROLE"));
    const revertData = `0xe2517d3f${encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [OWNER, role],
    ).slice(2)}` as Hex;
    publicClient.call = async () => {
      throw { cause: { data: revertData } };
    };
    try {
      await execute(
        [
          { kind: "requireChain", chainId: 42161 },
          { kind: "tx", to: VAULT, data: "0xeb2f8f77" },
        ],
        { walletClient, publicClient },
      );
      throw new Error("expected a revert");
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformActionError);
      expect((error as PlatformActionError).selector).toBe("0xe2517d3f");
      expect((error as PlatformActionError).code).toBe("E_ACCESS_CONTROL_UNAUTHORIZED_ACCOUNT");
      expect((error as PlatformActionError).revertData).toBe(revertData);
    }
  });

  test("does not invent a selector from the caller address or transaction hash", async () => {
    const { walletClient, publicClient } = clients(10n);
    publicClient.call = async ({ data }) => {
      if (data.startsWith(erc20.allowance.sel)) {
        return { data: encodeAbiParameters([{ type: "uint256" }], [10n]) };
      }
      throw { message: `Call from ${OWNER} to ${VAULT} reverted`, data: HASH };
    };
    try {
      await execute(flow(), { walletClient, publicClient });
      throw new Error("expected a revert");
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformActionError);
      expect((error as PlatformActionError).selector).toBeUndefined();
      expect((error as PlatformActionError).revertData).toBeUndefined();
      expect((error as PlatformActionError).message).toBe(
        "Contract call failed without usable revert data.",
      );
    }
  });

  test("uses a revert-only message field when no structured data is available", async () => {
    const { walletClient, publicClient } = clients(10n);
    publicClient.call = async ({ data }) => {
      if (data.startsWith(erc20.allowance.sel)) {
        return { data: encodeAbiParameters([{ type: "uint256" }], [10n]) };
      }
      throw { message: `Call from ${OWNER}: execution reverted: 0xdeadbeef` };
    };
    try {
      await execute(flow(), { walletClient, publicClient });
      throw new Error("expected a revert");
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformActionError);
      expect((error as PlatformActionError).selector).toBe("0xdeadbeef");
    }
  });

  test("does not probe or send when the wallet remains on the wrong chain", async () => {
    const { walletClient, publicClient, sent } = clients(10n);
    walletClient.getChainId = async () => 1;
    walletClient.switchChain = async () => undefined;
    let probed = false;
    publicClient.getCode = async () => {
      probed = true;
      return "0x";
    };
    await expect(execute(flow(), { walletClient, publicClient })).rejects.toThrow(
      "wallet did not switch to the target chain",
    );
    expect(probed).toBe(false);
    expect(sent).toEqual([]);
  });

  test("refuses a write flow with no initial chain gate", async () => {
    const { sent, ...clientsForExecute } = clients(10n);
    await expect(
      execute([{ kind: "tx", to: VAULT, data: "0x12345678" }], clientsForExecute),
    ).rejects.toThrow("write flow must start with one target chain");
    expect(sent).toEqual([]);
  });
});

describe("deposit approval flow", () => {
  test("approves, observes allowance, then submits the deposit", async () => {
    const { sent, ...clientsForExecute } = clients(0n);
    const statuses: string[] = [];
    const result = await execute(flow(), {
      ...clientsForExecute,
      onStatus: (status) => statuses.push(status),
    });
    expect(result.status).toBe("confirmed");
    expect(sent).toEqual([TOKEN, VAULT]);
    expect(statuses).toContain("approving");
  });

  test("submits the deposit directly when allowance is sufficient", async () => {
    const { sent, ...clientsForExecute } = clients(10n);
    const statuses: string[] = [];
    await execute(flow(), { ...clientsForExecute, onStatus: (status) => statuses.push(status) });
    expect(sent).toEqual([VAULT]);
    expect(statuses).not.toContain("approving");
  });

  test("does not submit a deposit after an unexecuted smart-wallet approval", async () => {
    const { sent, ...clientsForExecute } = clients(0n, true);
    const result = await execute(flow(SAFE), clientsForExecute);
    expect(result.status).toBe("proposed");
    expect(sent).toEqual([TOKEN]);
  });
});
