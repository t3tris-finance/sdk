import { describe, expect, test } from "bun:test";
import { type Address, encodeAbiParameters, keccak256, toBytes } from "viem";
import { curateOracle, curateRoles, curateSilo, curateVault } from "../../src/curate/calls";
import { createCurate } from "../../src/curate/index";
import { roleId, VAULT_PAUSE_ROLE, VAULT_SETTLE_ROLE, ZERO_ROLE } from "../../src/curate/roles";
import { encodeMulticall } from "../../src/curate/shared";
import { FeeClaimType } from "../../src/curate/vault";
import { encodeCall } from "../../src/wallet/engine";

const VAULT = "0xa11ce00000000000000000000000000000000001" as Address;
const ACCOUNT = "0x2222222222222222222222222222222222222222" as Address;
const ORACLE = "0x0e7000000000000000000000000000000000000e" as Address;

/** Records the raw tx the engine sends, so the calldata path is asserted end
 * to end (chain gate → simulate → send). */
function fakeClients() {
  const sent: { to: Address; data: `0x${string}` }[] = [];
  const hash = `0x${"ab".repeat(32)}` as const;
  const walletClient = {
    account: { address: ACCOUNT },
    getChainId: async () => 42161,
    switchChain: async () => undefined,
    sendTransaction: async (args: { to: Address; data: `0x${string}` }) => {
      sent.push({ to: args.to, data: args.data });
      return hash;
    },
    signTypedData: async () => "0x" as const,
  };
  const publicClient = {
    call: async () => ({ data: "0x" as const }),
    getCode: async () => "0x" as const,
    getBlock: async () => ({ timestamp: 1n }),
    waitForTransactionReceipt: async () => ({
      status: "success" as const,
      blockNumber: 1n,
      transactionHash: hash,
    }),
  };
  return { sent, clients: { walletClient, publicClient } };
}

describe("curate call table", () => {
  test("selectors match the deployed ABI fragments", () => {
    expect(curateVault.setDepositEnabled.sel).toBe("0x5b17d04b");
    expect(curateVault.settleAll.sel).toBe("0x3b1d828d");
    expect(curateVault.claimFees.sel).toBe("0x43641268");
    expect(curateVault.updateSharesBatched.sel).toBe("0xb6fc343e");
    expect(curateRoles.grant.sel).toBe("0x2f2ff15d");
    expect(curateOracle.setTotalAssets.sel).toBe("0x1765b313");
    expect(curateSilo.pause.sel).toBe("0x8456cb59");
  });

  test("encodeCall appends ABI-encoded positional args", () => {
    const data = encodeCall(curateVault.setDepositEnabled, [true]);
    const arg = encodeAbiParameters([{ type: "bool" }], [true]).slice(2);
    expect(data).toBe(`0x5b17d04b${arg}`);
  });

  test("multicall wraps sub-calls with the Solady selector", () => {
    const inner = encodeCall(curateVault.setDepositEnabled, [true]);
    const batch = encodeMulticall([inner]);
    expect(batch.startsWith("0xac9650d8")).toBe(true);
    expect(batch).toBe(
      encodeCall({ sel: "0xac9650d8", in: [{ type: "bytes[]" }], out: [] }, [[inner]]),
    );
  });
});

describe("role ids", () => {
  test("derive from the canonical role names", () => {
    expect(VAULT_PAUSE_ROLE).toBe(keccak256(toBytes("PAUSE_ROLE")));
    expect(VAULT_SETTLE_ROLE).toBe(keccak256(toBytes("SETTLE_ROLE")));
    expect(ZERO_ROLE).toBe(`0x${"0".repeat(64)}`);
    expect(roleId("CUSTOM_ROLE")).toBe(keccak256(toBytes("CUSTOM_ROLE")));
  });
});

describe("createCurate actions", () => {
  test("vault.nextManagementFee decodes the single tuple output", async () => {
    const { clients } = fakeClients();
    const output = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [{ type: "bool" }, { type: "bool" }, { type: "uint64" }, { type: "uint32" }],
        },
      ],
      [[false, false, 0n, 0]],
    );
    const curate = createCurate({
      ...clients,
      publicClient: { ...clients.publicClient, call: async () => ({ data: output }) },
    });
    expect(await curate.vault.read.nextManagementFee({ vault: VAULT })).toEqual({
      pending: false,
      daysPending: false,
      wad: 0n,
      days: 0,
    });
  });

  test("vault.setDepositEnabled sends the encoded selector to the vault", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    const result = await curate.vault.setDepositEnabled({
      chainId: 42161,
      vault: VAULT,
      enabled: false,
    });
    expect(result.status).toBe("confirmed");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(VAULT);
    expect(sent[0]?.data).toBe(encodeCall(curateVault.setDepositEnabled, [false]));
  });

  test("vault.settle encodes the FeeClaimType enum for settleAll", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    await curate.vault.settle({
      chainId: 42161,
      vault: VAULT,
      kind: "both",
      feeClaimType: FeeClaimType.Full,
    });
    expect(sent[0]?.data).toBe(encodeCall(curateVault.settleAll, [FeeClaimType.Full, false, "0x"]));
  });

  test("vault.applyDepositWhitelist fuses addresses into one multicall", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    const other = "0x3333333333333333333333333333333333333333" as Address;
    await curate.vault.applyDepositWhitelist({
      chainId: 42161,
      vault: VAULT,
      addresses: [ACCOUNT, other],
      whitelisted: true,
    });
    const expected = encodeMulticall([
      encodeCall(curateVault.setDepositWhitelisted, [ACCOUNT, true]),
      encodeCall(curateVault.setDepositWhitelisted, [other, true]),
    ]);
    expect(sent[0]?.data).toBe(expected);
  });

  test("roles.grantAll multicalls one grant per role", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    const roles = [VAULT_SETTLE_ROLE, VAULT_PAUSE_ROLE];
    await curate.roles.grantAll({ chainId: 42161, vault: VAULT, account: ACCOUNT, roles });
    const expected = encodeMulticall(
      roles.map((role) => encodeCall(curateRoles.grant, [role, ACCOUNT])),
    );
    expect(sent[0]?.data).toBe(expected);
  });

  test("oracle.setTotalAssets targets the oracle, not the vault", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    await curate.oracle.setTotalAssets({ chainId: 42161, oracle: ORACLE, totalAssets: 42n });
    expect(sent[0]?.to).toBe(ORACLE);
    expect(sent[0]?.data).toBe(encodeCall(curateOracle.setTotalAssets, [42n]));
  });

  test("vault.updateSharesBatched targets the vault with receivers and values", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    const other = "0x4444444444444444444444444444444444444444" as Address;
    await curate.vault.updateSharesBatched({
      chainId: 42161,
      vault: VAULT,
      receivers: [ACCOUNT, other],
      values: [1n, 2n],
    });
    expect(sent[0]?.to).toBe(VAULT);
    expect(sent[0]?.data).toBe(
      encodeCall(curateVault.updateSharesBatched, [
        [ACCOUNT, other],
        [1n, 2n],
      ]),
    );
  });

  test("an updateSharesBatched with no receivers is rejected before any tx", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    expect(
      curate.vault.updateSharesBatched({ chainId: 42161, vault: VAULT, receivers: [], values: [] }),
    ).rejects.toThrow(/at least one receiver/);
    expect(sent).toHaveLength(0);
  });

  test("a whitelist batch with no addresses is rejected before any tx", async () => {
    const { sent, clients } = fakeClients();
    const curate = createCurate(clients);
    expect(
      curate.vault.applyWithdrawWhitelist({
        chainId: 42161,
        vault: VAULT,
        addresses: [],
        whitelisted: true,
      }),
    ).rejects.toThrow(/at least one address/);
    expect(sent).toHaveLength(0);
  });
});
