import { describe, expect, test } from "bun:test";
import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
  type Hex,
} from "viem";
import {
  ChainMismatchError,
  createT3trisClient,
  defaultSafeOracle,
  factoryOracleClone,
} from "../../src";
import type { OnchainClients } from "../../src/onchain/transport/engine";

const account = "0x1111111111111111111111111111111111111111" as const;
const vault = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"ab".repeat(32)}` as Hex;
function fixture() {
  let chainId = 42161;
  let rpcChainId = 42161;
  let addresses: Address[] = [account];
  let code: Hex = "0x";
  let failRead = false;
  let simulate: (() => void) | undefined;
  let sendError: Error | undefined;
  const calls: string[] = [];
  const clients: OnchainClients = {
    walletClient: {
      account: { address: account },
      getAddresses: async () => addresses,
      getChainId: async () => chainId,
      sendTransaction: async () => {
        calls.push("send");
        if (sendError) throw sendError;
        return hash;
      },
    },
    publicClient: {
      getChainId: async () => rpcChainId,
      getCode: async () => {
        if (failRead) throw new Error("RPC unavailable");
        return code;
      },
      call: async () => {
        calls.push("simulate");
        simulate?.();
        return { data: "0x" };
      },
    },
  };
  return {
    clients,
    calls,
    client: createT3trisClient(clients),
    setChain: (value: number) => {
      chainId = value;
    },
    setRpcChain: (value: number) => {
      rpcChainId = value;
    },
    setAddresses: (value: Address[]) => {
      addresses = value;
    },
    setCode: (value: Hex) => {
      code = value;
    },
    failRead: () => {
      failRead = true;
    },
    onSimulate: (fn: () => void) => {
      simulate = fn;
    },
    failSend: (error: Error) => {
      sendError = error;
    },
  };
}
const target = { chainId: 42161, address: vault };

describe("explicit wallet actions", () => {
  test("create submits exactly one creation transaction", async () => {
    const f = fixture();
    const result = await f.client.vaults.create({
      chainId: 42161,
      factory: vault,
      salt: hash,
      oracle: factoryOracleClone,
      safeOracle: defaultSafeOracle(account),
      params: {
        shareName: "Test",
        shareSymbol: "TST",
        ipfsHash: "",
        underlyingAsset: vault,
        oracle: factoryOracleClone,
        vaultOwner: account,
        curator: account,
        feeRecipient: account,
        transferEnabled: false,
        depositEnabled: false,
        depositWhitelistEnabled: false,
        withdrawWhitelistEnabled: false,
        vaultOpened: false,
        globalFees: {
          entryFeeWad: 0n,
          exitFeeWad: 0n,
          managementFeeWad: 0n,
          performanceFeeWad: 0n,
          managementFeeDays: 365,
        },
      },
    });
    expect(result).toEqual({ status: "submitted", hash });
    expect(f.calls).toEqual(["simulate", "send"]);
  });
  test("wrong wallet or RPC chain never switches or sends", async () => {
    for (const mismatch of ["wallet", "rpc"]) {
      const f = fixture();
      if (mismatch === "wallet") f.setChain(1);
      else f.setRpcChain(1);
      await expect(f.client.vaults.setNextEntryFee({ ...target, wad: 1n })).rejects.toBeInstanceOf(
        ChainMismatchError,
      );
      expect(f.calls).toEqual([]);
    }
  });
  test("deposit, requestDeposit and redeem never add approvals, signatures or claims", async () => {
    const f = fixture();
    await f.client.vaults.deposit({ ...target, amount: 1n });
    await f.client.vaults.requestDeposit({ ...target, amount: 1n });
    await f.client.vaults.redeem({ ...target, shares: 1n });
    expect(f.calls).toEqual(["simulate", "send", "simulate", "send", "simulate", "send"]);
  });
  test("settlement and fee claim do not fund the curator implicitly", async () => {
    const f = fixture();
    await f.client.vaults.settle({ ...target, kind: "both" });
    await f.client.vaults.claimFees({ ...target, shares: 1n });
    expect(f.calls).toEqual(["simulate", "send", "simulate", "send"]);
  });
  test("account or chain changes during simulation abort before sending", async () => {
    for (const change of ["account", "chain"]) {
      const f = fixture();
      f.onSimulate(() => (change === "account" ? f.setAddresses([vault]) : f.setChain(1)));
      await expect(f.client.vaults.pause(target)).rejects.toThrow();
      expect(f.calls).toEqual(["simulate"]);
    }
  });
  test("Safe returns proposed, delegated EOA submitted; no receipt wait", async () => {
    const f = fixture();
    f.setCode("0x6000");
    expect((await f.client.vaults.pause(target)).status).toBe("proposed");
    f.setCode(`0xef0100${vault.slice(2)}`);
    expect((await f.client.vaults.pause(target)).status).toBe("submitted");
    f.failRead();
    await expect(f.client.vaults.pause(target)).rejects.toThrow("RPC unavailable");
    expect(f.calls.filter((call) => call === "send")).toHaveLength(2);
  });
  test("failed send is never retried or replaced by an approval", async () => {
    const f = fixture();
    f.failSend(new Error("Response lost"));
    await expect(f.client.vaults.deposit({ ...target, amount: 1n })).rejects.toThrow(
      "Response lost",
    );
    expect(f.calls).toEqual(["simulate", "send"]);
  });
  test("preserves nested revert payloads but never treats an address or hash as a selector", async () => {
    const f = fixture();
    const error = Object.assign(new Error(`Call from ${account} reverted`), {
      cause: { data: { data: "0xd93c0665" } },
    });
    f.clients.publicClient.call = async () => {
      throw error;
    };
    await expect(f.client.vaults.pause(target)).rejects.toMatchObject({
      code: "E_ENFORCED_PAUSE",
      selector: "0xd93c0665",
      revertData: "0xd93c0665",
    });
    const rpcError = Object.assign(new Error(`Call from ${account} failed`), { data: hash });
    f.clients.publicClient.call = async () => {
      throw rpcError;
    };
    await expect(f.client.vaults.pause(target)).rejects.toBe(rpcError);
    expect(f.calls).toEqual([]);
  });
  test("wallet construction ignores API env and rejects mixed credentials", () => {
    const f = fixture();
    expect("catalog" in f.client).toBe(false);
    expect("attachVault" in f.client).toBe(false);
    expect(() =>
      createT3trisClient({ ...f.clients, apiKey: "sk_test_not_allowed" } as never),
    ).toThrow("separate API and wallet");
  });
  test("raw provider and ordinary viem clients need no adapter or connection prompt", () => {
    const methods: string[] = [];
    const provider = {
      request: async ({ method }: { method: string }) => {
        methods.push(method);
        throw new Error("No request expected");
      },
    } as EIP1193Provider;
    const transport = custom(provider);
    const direct = createT3trisClient({
      walletClient: createWalletClient({ account, transport }),
      publicClient: createPublicClient({ transport }),
    });
    const raw = createT3trisClient({ provider, account });
    expect(typeof direct.vaults.create).toBe("function");
    expect(typeof raw.vaults.create).toBe("function");
    expect(methods).toEqual([]);
  });
});
