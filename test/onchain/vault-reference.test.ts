import { expect, test } from "bun:test";
import { type Address, encodeAbiParameters, type Hex } from "viem";
import { createT3trisClient, T3TRIS_FACTORY_ADDRESS, type VaultRef } from "../../src";

const ref: VaultRef = { chainId: 42161, address: "0x2222222222222222222222222222222222222222" };
const account = "0x1111111111111111111111111111111111111111" as Address;
const hash = `0x${"ab".repeat(32)}` as Hex;

test("one VaultRef targets API, vault reads/writes and vault roles without remapping", async () => {
  const targets: (Address | undefined)[] = [];
  const api = createT3trisClient({
    fetch: async (url) => {
      expect(String(url)).toContain(`/vaults/${ref.chainId}/${ref.address}`);
      return Response.json(ref);
    },
  });
  expect(await api.vaults.get(ref)).toEqual(ref);
  const wallet = createT3trisClient({
    walletClient: {
      account: { address: account },
      getAddresses: async () => [account],
      getChainId: async () => 42161,
      sendTransaction: async (input) => {
        targets.push(input.to);
        return hash;
      },
    },
    publicClient: {
      getChainId: async () => 42161,
      getCode: async () => "0x",
      call: async (input) => {
        targets.push(input.to);
        return { data: encodeAbiParameters([{ type: "bool" }], [true]) };
      },
    },
  });
  for (const method of ["deposit", "redeem", "open"]) expect(method in wallet.vaults).toBe(false);
  for (const method of [
    "maxDeposit",
    "maxRedeem",
    "previewDeposit",
    "previewRedeem",
    "previewOpen",
  ])
    expect(method in wallet.vaults.read).toBe(false);
  expect(await wallet.vaults.read.isOpen(ref)).toBe(true);
  expect(await wallet.vaults.requestDeposit({ ...ref, amount: 1n })).toEqual({
    status: "submitted",
    hash,
  });
  expect(await wallet.roles.grant({ ...ref, role: hash, account })).toEqual({
    status: "submitted",
    hash,
  });
  expect(targets.length).toBeGreaterThanOrEqual(5);
  expect(targets.every((target) => target === ref.address)).toBe(true);
  // Prediction shares the same fixed factory on every selected chain.
  const predictionTargets: (Address | undefined)[] = [];
  const predictor = createT3trisClient({
    walletClient: {
      getChainId: async () => 4663,
      getAddresses: async () => [account],
      sendTransaction: async () => hash,
    },
    publicClient: {
      getChainId: async () => 4663,
      getCode: async () => "0x",
      call: async (input) => {
        predictionTargets.push(input.to);
        return { data: encodeAbiParameters([{ type: "address" }], [ref.address]) };
      },
    },
  });
  expect(
    await predictor.vaults.read.previewAddress({
      chainId: 4663,
      deployer: account,
      salt: hash,
      ...{ factory: account },
    }),
  ).toBe(ref.address);
  expect(predictionTargets).toEqual([T3TRIS_FACTORY_ADDRESS]);
});
