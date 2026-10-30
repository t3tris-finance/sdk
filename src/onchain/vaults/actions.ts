import type { Address, Hex } from "viem";
import { earn, erc20 } from "../abi/vault";
import { bindActions, bindReads } from "../transport/bindings";
import { encodeCall, type OnchainClients, readCall, requireAccount } from "../transport/engine";
import { type DeployVaultArgs, encodeDeployVault, previewVaultAddress } from "./deployment";

interface Target {
  vault: Address;
  chainId: number;
}
export interface DepositInput extends Target {
  amount: bigint;
  receiver?: Address;
  permit2Data?: Hex;
}
export interface RequestDepositInput extends Target {
  amount: bigint;
  controller?: Address;
  permit2Data?: Hex;
}
export interface RedeemInput extends Target {
  shares: bigint;
  receiver?: Address;
  owner?: Address;
}
export interface RequestRedeemInput extends Target {
  shares: bigint;
  controller?: Address;
  owner?: Address;
}
export interface DecreaseDepositInput extends Target {
  amount: bigint;
  receiver?: Address;
  minAmountOut: bigint;
}
export interface DecreaseRedeemInput extends Target {
  shares: bigint;
  owner?: Address;
  receiver?: Address;
}
export interface ClaimDepositInput extends Target {
  receiver?: Address;
}
export interface ClaimRedeemInput extends Target {
  receiver?: Address;
  owner?: Address;
}

/** Explicit contract actions. Funding, approvals, permits and claim-before-redeem are the caller's responsibility. */
export function makeDepositorActions(clients: OnchainClients) {
  const account = () => requireAccount(clients.walletClient);
  const tx = (i: Target, data: Hex) => ({ chainId: i.chainId, to: i.vault, data });
  const builders = {
    create: (i: DeployVaultArgs) => ({
      chainId: i.chainId,
      to: i.factory,
      data: encodeDeployVault(i),
    }),
    deposit: (i: DepositInput) =>
      tx(
        i,
        encodeCall(earn.depositWithPayload, [
          i.receiver ?? account(),
          i.amount,
          i.permit2Data ?? "0x",
        ]),
      ),
    requestDeposit: (i: RequestDepositInput) =>
      tx(
        i,
        encodeCall(earn.requestDeposit, [
          i.controller ?? account(),
          false,
          i.amount,
          i.permit2Data ?? "0x",
        ]),
      ),
    redeem: (i: RedeemInput) =>
      tx(i, encodeCall(earn.redeem, [i.shares, i.receiver ?? account(), i.owner ?? account()])),
    requestRedeem: (i: RequestRedeemInput) =>
      tx(
        i,
        encodeCall(earn.requestRedeem, [
          i.controller ?? account(),
          i.owner ?? account(),
          i.owner ?? account(),
          false,
          i.shares,
        ]),
      ),
    decreaseDepositRequest: (i: DecreaseDepositInput) =>
      tx(
        i,
        encodeCall(earn.decreaseDepositRequest, [
          i.receiver ?? account(),
          false,
          i.amount,
          i.minAmountOut,
        ]),
      ),
    decreaseRedeemRequest: (i: DecreaseRedeemInput) =>
      tx(
        i,
        encodeCall(earn.decreaseRedeemRequest, [
          i.owner ?? account(),
          i.receiver ?? account(),
          i.shares,
        ]),
      ),
    claimDeposit: (i: ClaimDepositInput) =>
      tx(i, encodeCall(earn.claimDeposit, [i.receiver ?? account()])),
    claimRedeem: (i: ClaimRedeemInput) =>
      tx(i, encodeCall(earn.claimRedeem, [i.owner ?? account(), i.receiver ?? account(), false])),
  };
  const read = {
    previewAddress: (i: { factory: Address; deployer: Address; salt: Hex }) =>
      previewVaultAddress(clients.publicClient, i),
    asset: async (i: { vault: Address }) =>
      (
        await readCall<[Address]>(earn.underlying, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    totalSupply: async (i: { vault: Address }) =>
      (
        await readCall<[bigint]>(erc20.totalSupply, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    maxDeposit: async (i: { vault: Address; receiver: Address }) =>
      (
        await readCall<[bigint]>(earn.maxDeposit, clients.publicClient, {
          address: i.vault,
          args: [i.receiver],
        })
      )[0],
    maxRedeem: async (i: { vault: Address; owner: Address }) =>
      (
        await readCall<[bigint]>(earn.maxRedeem, clients.publicClient, {
          address: i.vault,
          args: [i.owner],
        })
      )[0],
    previewDeposit: async (i: { vault: Address; amount: bigint }) =>
      (
        await readCall<[bigint]>(earn.previewDeposit, clients.publicClient, {
          address: i.vault,
          args: [i.amount],
        })
      )[0],
    previewRedeem: async (i: { vault: Address; shares: bigint }) =>
      (
        await readCall<[bigint]>(earn.previewRedeem, clients.publicClient, {
          address: i.vault,
          args: [i.shares],
        })
      )[0],
    previewClaimDeposit: async (i: { vault: Address; owner: Address }) =>
      (
        await readCall<[bigint]>(earn.previewClaimDeposit, clients.publicClient, {
          address: i.vault,
          args: [i.owner],
        })
      )[0],
  };
  return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
