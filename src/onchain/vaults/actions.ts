import type { Address, Hex } from "viem";
import { earn, erc20 } from "../abi/vault";
import { bindActions, bindReads } from "../transport/bindings";
import { encodeCall, type OnchainClients, readCall, requireAccount } from "../transport/engine";
import { type DeployVaultArgs, encodeDeployVault, previewVaultAddress } from "./deployment";

interface Target {
  address: Address;
  chainId: number;
}
export interface RequestDepositInput extends Target {
  amount: bigint;
  controller?: Address;
  permit2Data?: Hex;
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
  const tx = (i: Target, data: Hex) => ({ chainId: i.chainId, to: i.address, data });
  const builders = {
    create: (i: DeployVaultArgs) => ({
      chainId: i.chainId,
      to: i.factory,
      data: encodeDeployVault(i),
    }),
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
    asset: async (i: { address: Address }) =>
      (
        await readCall<[Address]>(earn.underlying, clients.publicClient, {
          address: i.address,
          args: [],
        })
      )[0],
    totalSupply: async (i: { address: Address }) =>
      (
        await readCall<[bigint]>(erc20.totalSupply, clients.publicClient, {
          address: i.address,
          args: [],
        })
      )[0],
    previewClaimDeposit: async (i: { address: Address; owner: Address }) =>
      (
        await readCall<[bigint]>(earn.previewClaimDeposit, clients.publicClient, {
          address: i.address,
          args: [i.owner],
        })
      )[0],
  };
  return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
