import { describe, expect, test } from "bun:test";
import {
  decodeAbiParameters,
  keccak256,
  parseAbiParameters,
  stringToBytes,
  zeroAddress,
} from "viem";
import {
  type DeployVaultArgs,
  defaultSafeOracle,
  encodeDeployVault,
  factory,
  SAFE_ORACLE_DEVIATION_DOWN,
  SAFE_ORACLE_DEVIATION_UP,
} from "../../src/onchain/vaults/deployment";

const OWNER = "0x1111111111111111111111111111111111111111" as const;
const ASSET = "0x2222222222222222222222222222222222222222" as const;
const ORACLE = "0x4444444444444444444444444444444444444444" as const;
const SALT = `0x${"33".repeat(32)}` as const;
const REFERRAL = `0x${"55".repeat(32)}` as const;
const args: DeployVaultArgs = {
  chainId: 42161,
  name: "Flagship",
  symbol: "FLG",
  asset: ASSET,
  owner: OWNER,
  curator: OWNER,
  feeRecipient: OWNER,
  config: {
    ipfsHash: "ipfs://test",
    transferEnabled: true,
    depositEnabled: false,
    depositWhitelistEnabled: true,
    withdrawWhitelistEnabled: false,
  },
  fees: { entry: 1n, exit: 2n, performance: 3n, management: 4n, managementDays: 365 },
  oracle: { safe: true, owner: OWNER, maxDeviationUp: 5n, maxDeviationDown: 6n },
  deployment: { salt: SALT, referralCode: REFERRAL },
};
const abi = parseAbiParameters(
  "(string,string,string,(uint64,uint64,uint64,uint64,uint32),address,address,address,address,address,bool,bool,bool,bool,bool), (address,uint128,uint64), address, bytes32, bytes32",
);
const decode = (input: DeployVaultArgs) =>
  decodeAbiParameters(abi, `0x${encodeDeployVault(input).slice(10)}`);

describe("deployment payload", () => {
  test("selectors remain the canonical contract ABI", () => {
    expect(
      keccak256(
        stringToBytes(
          "deployVault((string,string,string,(uint64,uint64,uint64,uint64,uint32),address,address,address,address,address,bool,bool,bool,bool,bool),(address,uint128,uint64),address,bytes32,bytes32)",
        ),
      ).slice(0, 10),
    ).toBe(factory.deployVault.sel);
    expect(keccak256(stringToBytes("previewVaultAddress(address,bytes32)")).slice(0, 10)).toBe(
      factory.previewVaultAddress.sel,
    );
  });
  test("maps friendly fields to exact ABI order and a fresh SafeOracle", () => {
    const [params, safe, oracle, salt, referral] = decode(args);
    expect(params).toEqual([
      "Flagship",
      "FLG",
      "ipfs://test",
      [1n, 2n, 4n, 3n, 365],
      ASSET,
      zeroAddress,
      OWNER,
      OWNER,
      OWNER,
      true,
      false,
      true,
      false,
      false,
    ]);
    expect(safe).toEqual([OWNER, 5n, 6n]);
    expect(oracle).toBe(zeroAddress);
    expect(salt).toBe(SALT);
    expect(referral).toBe(REFERRAL);
  });
  test("existing oracle needs no SafeOracle fields and is consistent in both ABI slots", () => {
    const [params, safe, oracle, , referral] = decode({
      ...args,
      oracle: { address: ORACLE },
      deployment: { salt: SALT },
    });
    expect(params[5]).toBe(ORACLE);
    expect(oracle).toBe(ORACLE);
    expect(safe).toEqual([zeroAddress, 0n, 0n]);
    expect(referral).toBe(`0x${"00".repeat(32)}`);
  });
  test("extra JS fields cannot open a vault or override ABI oracle selection", () => {
    const injected = {
      ...args,
      vaultOpened: true,
      params: { vaultOpened: true, oracle: ORACLE },
      safeOracle: { owner: ORACLE },
      config: { ...args.config, vaultOpened: true },
    };
    expect(encodeDeployVault(injected)).toBe(encodeDeployVault(args));
    expect(decode(injected)[0][13]).toBe(false);
  });
  test("rejects ambiguous, missing and invalid oracle configurations", () => {
    for (const oracle of [
      { safe: true, address: ORACLE, owner: OWNER, maxDeviationUp: 1n, maxDeviationDown: 1n },
      { safe: false, address: ORACLE },
      { address: zeroAddress },
      {},
      { safe: true, owner: zeroAddress, maxDeviationUp: 1n, maxDeviationDown: 1n },
      { address: ORACLE, owner: OWNER },
      { safe: true, owner: OWNER, maxDeviationUp: -1n, maxDeviationDown: 1n },
      { safe: true, owner: OWNER, maxDeviationUp: 1n, maxDeviationDown: 1n << 64n },
    ]) {
      expect(() =>
        encodeDeployVault({ ...args, oracle: oracle as DeployVaultArgs["oracle"] }),
      ).toThrow();
    }
  });
  test("omitted and partially supplied bounds use independent Curate defaults", () => {
    expect(decode({ ...args, oracle: { safe: true, owner: OWNER } })[1]).toEqual([
      OWNER,
      SAFE_ORACLE_DEVIATION_UP,
      SAFE_ORACLE_DEVIATION_DOWN,
    ]);
    expect(
      decode({ ...args, oracle: { safe: true, owner: OWNER, maxDeviationUp: 7n } })[1],
    ).toEqual([OWNER, 7n, SAFE_ORACLE_DEVIATION_DOWN]);
    expect(
      decode({ ...args, oracle: { safe: true, owner: OWNER, maxDeviationDown: 8n } })[1],
    ).toEqual([OWNER, SAFE_ORACLE_DEVIATION_UP, 8n]);
  });
  test("SafeOracle helper preserves current defaults with the new shape", () => {
    expect(defaultSafeOracle(OWNER)).toEqual({
      safe: true,
      owner: OWNER,
      maxDeviationUp: SAFE_ORACLE_DEVIATION_UP,
      maxDeviationDown: SAFE_ORACLE_DEVIATION_DOWN,
    });
    expect(defaultSafeOracle(OWNER, { maxDeviationDown: 3n })).toEqual({
      safe: true,
      owner: OWNER,
      maxDeviationUp: SAFE_ORACLE_DEVIATION_UP,
      maxDeviationDown: 3n,
    });
  });
});
