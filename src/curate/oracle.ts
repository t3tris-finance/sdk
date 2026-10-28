/**
 * `curate.oracle.*` — the SafeOracle admin surface: NAV push
 * (`setTotalAssets`), the up/down price-per-share deviation bounds, the OZ
 * `AccessControlDefaultAdminRules` 2-step admin transfer, and the role
 * grant/revoke/renounce trio.
 *
 * NOTE: the call-table op names are `setMaxDeviationUp` / `setMaxDeviationDown`
 * (the on-chain `setMaxPricePerShareDeviation{Up,Down}Wad`).
 */

import type { Address, Hex } from "viem";
import { encodeCall, type OnchainClients, readCall } from "../wallet/engine";
import { curateOracle } from "./calls";
import { bindActions, bindReads, encodeMulticall, transaction as txFlow } from "./shared";

export interface Target {
  readonly oracle: Address;
  readonly chainId: number;
}

const builders = {
  /** Push a fresh NAV (total assets) — the core valuation write. */
  setTotalAssets: (i: Target & { totalAssets: bigint }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setTotalAssets, [i.totalAssets])),

  // price-per-share deviation bounds
  setMaxPricePerShareDeviationUpWad: (i: Target & { wad: bigint }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setMaxDeviationUp, [i.wad])),
  setMaxPricePerShareDeviationDownWad: (i: Target & { wad: bigint }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setMaxDeviationDown, [i.wad])),

  // 2-step default-admin transfer
  beginDefaultAdminTransfer: (i: Target & { newAdmin: Address }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.beginAdminTransfer, [i.newAdmin])),
  acceptDefaultAdminTransfer: (i: Target) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.acceptAdminTransfer, [])),
  cancelDefaultAdminTransfer: (i: Target) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.cancelAdminTransfer, [])),
  changeDefaultAdminDelay: (i: Target & { newDelay: number }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.changeAdminDelay, [i.newDelay])),
  rollbackDefaultAdminDelay: (i: Target) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.rollbackAdminDelay, [])),

  // roles
  grant: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.grant, [i.role, i.account])),
  revoke: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.revoke, [i.role, i.account])),
  renounce: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.oracle, encodeCall(curateOracle.renounce, [i.role, i.account])),

  /** Apply a batch of role changes on the oracle in ONE multicall. Mixed ops
   * are allowed so a full-manager grant can bootstrap a family the owner lacks:
   * an admin self-grant, the action-leaf grant to the target, then the admin
   * self-revoke — all atomic (Solady `multicall` delegatecalls, so `msg.sender`
   * stays the owner). Order is load-bearing: admin grants precede the leaf
   * grants they authorise. */
  applyRoles: (
    i: Target & { calls: readonly { op: "grant" | "revoke"; role: Hex; account: Address }[] },
  ) => {
    if (i.calls.length === 0) {
      throw new Error("curate.oracle: applyRoles requires at least one call");
    }
    const subcalls = i.calls.map((c) =>
      encodeCall(c.op === "grant" ? curateOracle.grant : curateOracle.revoke, [c.role, c.account]),
    );
    return txFlow(i.chainId, i.oracle, encodeMulticall(subcalls));
  },
};

/** Build the `curate.oracle` namespace: writes + reads. */
export function makeOracleActions(clients: OnchainClients) {
  const read = {
    totalAssets: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [bigint]>(curateOracle.totalAssets, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    maxDeviationUp: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [bigint]>(curateOracle.maxDeviationUp, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    maxDeviationDown: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [bigint]>(curateOracle.maxDeviationDown, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    admin: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [Address]>(curateOracle.admin, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    defaultAdminDelay: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [bigint]>(curateOracle.defaultAdminDelay, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    pendingAdmin: async (i: { oracle: Address }) => {
      const [pending, delay] = await readCall<readonly [Address, number]>(
        curateOracle.pendingAdmin,
        clients.publicClient,
        { address: i.oracle, args: [] },
      );
      return { pending, delay };
    },
    owner: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [Address]>(curateOracle.owner, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
    has: async (i: { oracle: Address; role: Hex; account: Address }) =>
      (
        await readCall<readonly [boolean]>(curateOracle.has, clients.publicClient, {
          address: i.oracle,
          args: [i.role, i.account],
        })
      )[0],
    /** Last PPS saved by a valuation — the deviation-check anchor (0 before the first). */
    lastSavedPps: async (i: { oracle: Address }) =>
      (
        await readCall<readonly [bigint]>(curateOracle.lastSavedPps, clients.publicClient, {
          address: i.oracle,
          args: [],
        })
      )[0],
  };
  return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
