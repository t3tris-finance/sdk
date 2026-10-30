import { describe, expect, test } from "bun:test";
import { keccak256, stringToBytes, zeroAddress } from "viem";
import {
  defaultSafeOracle,
  encodeDeployVault,
  factory,
  factoryOracleClone,
  SAFE_ORACLE_DEVIATION_DOWN,
  SAFE_ORACLE_DEVIATION_UP,
} from "../../src/onchain/vaults/deployment";

const OWNER = "0x1111111111111111111111111111111111111111" as const;
const ASSET = "0x2222222222222222222222222222222222222222" as const;
const SALT = "0x3333333333333333333333333333333333333333333333333333333333333333" as const;

describe("factory selectors", () => {
  test("deployVault matches the T3tris ABI signature", () => {
    const sig =
      "deployVault((string,string,string,(uint64,uint64,uint64,uint64,uint32),address,address,address,address,address,bool,bool,bool,bool,bool),(address,uint128,uint64),address,bytes32,bytes32)";
    expect(keccak256(stringToBytes(sig)).slice(0, 10)).toBe(factory.deployVault.sel);
  });

  test("previewVaultAddress matches the T3tris ABI signature", () => {
    expect(keccak256(stringToBytes("previewVaultAddress(address,bytes32)")).slice(0, 10)).toBe(
      factory.previewVaultAddress.sel,
    );
  });
});

describe("encodeDeployVault", () => {
  test("prefixes the deployVault selector and encodes a full params tuple", () => {
    const data = encodeDeployVault({
      params: {
        shareName: "Flagship",
        shareSymbol: "FLG",
        ipfsHash: "",
        globalFees: {
          entryFeeWad: 0n,
          exitFeeWad: 0n,
          managementFeeWad: 0n,
          performanceFeeWad: 0n,
          managementFeeDays: 365,
        },
        underlyingAsset: ASSET,
        oracle: zeroAddress,
        vaultOwner: OWNER,
        curator: OWNER,
        feeRecipient: OWNER,
        transferEnabled: true,
        depositEnabled: true,
        depositWhitelistEnabled: false,
        withdrawWhitelistEnabled: false,
        vaultOpened: false,
      },
      safeOracle: defaultSafeOracle(OWNER),
      oracle: zeroAddress,
      salt: SALT,
    });
    expect(data.startsWith(factory.deployVault.sel)).toBe(true);
    expect(data.length).toBeGreaterThan(10);
  });

  test("default SafeOracle uses unbounded up / 100 % down", () => {
    const oracle = defaultSafeOracle(OWNER);
    expect(oracle.owner).toBe(OWNER);
    expect(oracle.maxDeviationUpWad).toBe(SAFE_ORACLE_DEVIATION_UP);
    expect(oracle.maxDeviationDownWad).toBe(SAFE_ORACLE_DEVIATION_DOWN);
    expect(SAFE_ORACLE_DEVIATION_DOWN).toBe(10n ** 18n);
  });

  test("bounds override either deviation and leave the other default", () => {
    const partial = defaultSafeOracle(OWNER, { maxDeviationDownWad: 3n });
    expect(partial).toEqual({
      owner: OWNER,
      maxDeviationUpWad: SAFE_ORACLE_DEVIATION_UP,
      maxDeviationDownWad: 3n,
    });

    const params = {
      shareName: "Flagship",
      shareSymbol: "FLG",
      ipfsHash: "",
      globalFees: {
        entryFeeWad: 0n,
        exitFeeWad: 0n,
        managementFeeWad: 0n,
        performanceFeeWad: 0n,
        managementFeeDays: 365,
      },
      underlyingAsset: ASSET,
      oracle: zeroAddress,
      vaultOwner: OWNER,
      curator: OWNER,
      feeRecipient: OWNER,
      transferEnabled: true,
      depositEnabled: true,
      depositWhitelistEnabled: false,
      withdrawWhitelistEnabled: false,
      vaultOpened: false,
    };
    const base = encodeDeployVault({
      params,
      safeOracle: defaultSafeOracle(OWNER),
      oracle: factoryOracleClone,
      salt: SALT,
    });
    const tightened = encodeDeployVault({
      params,
      safeOracle: defaultSafeOracle(OWNER, { maxDeviationUpWad: 5n, maxDeviationDownWad: 6n }),
      oracle: factoryOracleClone,
      salt: SALT,
    });
    expect(tightened).not.toBe(base);
    expect(base.startsWith(factory.deployVault.sel)).toBe(true);
    expect(tightened.startsWith(factory.deployVault.sel)).toBe(true);
  });

  test("factoryOracleClone is the zero-address clone sentinel", () => {
    expect(factoryOracleClone).toBe(zeroAddress);
  });
});
