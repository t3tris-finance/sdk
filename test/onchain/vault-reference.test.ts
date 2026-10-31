import { expect, test } from "bun:test";
import { type Address, encodeAbiParameters, type Hex } from "viem";
import { createT3trisClient, type VaultRef } from "../../src";

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
  expect(await wallet.vaults.read.isOpen(ref)).toBe(true);
  expect(await wallet.vaults.deposit({ ...ref, amount: 1n })).toEqual({
    status: "submitted",
    hash,
  });
  expect(await wallet.roles.grant({ ...ref, role: hash, account })).toEqual({
    status: "submitted",
    hash,
  });
  expect(targets.length).toBeGreaterThanOrEqual(5);
  expect(targets.every((target) => target === ref.address)).toBe(true);
});
