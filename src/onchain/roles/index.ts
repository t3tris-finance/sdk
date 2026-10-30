/**
 * Vault AccessControlEnumerable actions and membership reads. Single
 * grants / revokes / renounces plus a `grantAll` that fuses many `grantRole`
 * sub-calls into one Solady `multicall(bytes[])`, and the 2-step admin handover
 * (`initGrantAdmin` → `acceptAdmin`, or cancel / applyAdminBurn).
 *
 * Role ids are keccak256(name). Use roleId for a role's canonical name.
 */

import { type Address, type Hex, keccak256, toBytes } from "viem";
import { curateRoles } from "../abi/admin";
import {
  bindActions,
  bindReads,
  encodeMulticall,
  transaction as txFlow,
} from "../transport/bindings";
import { encodeCall, type OnchainClients, readCall } from "../transport/engine";

/** The bytes32 role id for a role name: `keccak256(utf8Bytes(name))`. Matches
 * OpenZeppelin's `keccak256("SOME_ROLE")` id derivation. */
export const roleId = (name: string): Hex => keccak256(toBytes(name));

/** bytes32(0) — the OZ default admin id, which is also the vault super-admin. */
export const ZERO_ROLE: Hex = `0x${"0".repeat(64)}`;

const idOf = (...fragments: readonly string[]): Hex => roleId(fragments.join("_"));

/** Vault lifecycle roles (pause is dual-role: one to pause, one to unpause). */
export const VAULT_PAUSE_ROLE: Hex = idOf("PAUSE", "ROLE");
export const VAULT_UNPAUSE_ROLE: Hex = idOf("UNPAUSE", "ROLE");
export const VAULT_ENABLE_DEPOSIT_ROLE: Hex = idOf("ENABLE", "DEPOSIT", "ROLE");
export const VAULT_ENABLE_TRANSFER_ROLE: Hex = idOf("ENABLE", "TRANSFER", "ROLE");
export const VAULT_ENABLE_END_OF_FUND_ROLE: Hex = idOf("ENABLE", "END", "OF", "FUND", "ROLE");
export const VAULT_DISABLE_END_OF_FUND_ROLE: Hex = idOf("DISABLE", "END", "OF", "FUND", "ROLE");
export const VAULT_OPEN_ROLE: Hex = idOf("OPEN", "ROLE");
export const VAULT_CLOSE_ROLE: Hex = idOf("CLOSE", "ROLE");
/** Protocol governance super-admin — Open/Close vault is this seat only. */
export const VAULT_GOVERNANCE_ADMIN_ROLE: Hex = idOf("GOVERNANCE", "ADMIN", "ROLE");

/** The vault-scoped operating leaves (settlement / fees / access / operator /
 * metadata) — the granular-picker catalogue. */
export const VAULT_SETTLE_ROLE: Hex = idOf("SETTLE", "ROLE");
export const VAULT_SETTLE_DEPOSITS_ROLE: Hex = idOf("SETTLE", "DEPOSITS", "ROLE");
export const VAULT_SETTLE_REDEMPTIONS_ROLE: Hex = idOf("SETTLE", "REDEMPTIONS", "ROLE");
export const VAULT_CLAIM_FEES_ROLE: Hex = idOf("CLAIM", "FEES", "ROLE");
export const VAULT_UPDATE_ACCRUED_FEES_ROLE: Hex = idOf("UPDATE", "ACCRUED", "FEES", "ROLE");
export const VAULT_UPDATE_ENTRY_FEE_WAD_ROLE: Hex = idOf("UPDATE", "ENTRY", "FEE", "WAD", "ROLE");
export const VAULT_UPDATE_EXIT_FEE_WAD_ROLE: Hex = idOf("UPDATE", "EXIT", "FEE", "WAD", "ROLE");
export const VAULT_UPDATE_MGMT_FEE_WAD_ROLE: Hex = idOf("UPDATE", "MGMT", "FEE", "WAD", "ROLE");
export const VAULT_UPDATE_PERFORMANCE_FEE_WAD_ROLE: Hex = idOf(
  "UPDATE",
  "PERFORMANCE",
  "FEE",
  "WAD",
  "ROLE",
);
export const VAULT_ENABLE_WHITELIST_ROLE: Hex = idOf("ENABLE", "WHITELIST", "ROLE");
export const VAULT_SET_WHITELISTED_ROLE: Hex = idOf("SET", "WHITELISTED", "ROLE");
export const VAULT_UPDATE_CURATOR_ROLE: Hex = idOf("UPDATE", "CURATOR", "ROLE");
export const VAULT_UPDATE_FEE_RECIPIENT_ROLE: Hex = idOf("UPDATE", "FEE", "RECIPIENT", "ROLE");
export const VAULT_UPDATE_ORACLE_ROLE: Hex = idOf("UPDATE", "ORACLE", "ROLE");
export const VAULT_UPDATE_SHARES_ROLE: Hex = idOf("UPDATE", "SHARES", "ROLE");
export const VAULT_SET_SHARE_NAME_SYMBOL_ROLE: Hex = idOf("SET", "SHARE", "NAME", "SYMBOL", "ROLE");
export const VAULT_UPGRADE_VAULT_ROLE: Hex = idOf("UPGRADE", "VAULT", "ROLE");

/** Governance-administered vault roles. SET_IPFS_HASH_ROLE is administered
 * by the vault super-admin instead. */
export const VAULT_UPDATE_T3TREASURY_ROLE: Hex = idOf("UPDATE", "T3TREASURY", "ROLE");
export const VAULT_SWEEP_ROLE: Hex = idOf("SWEEP", "ROLE");
export const VAULT_CLAIM_SILO_PNL_ROLE: Hex = idOf("CLAIM", "SILO", "PNL", "ROLE");
export const VAULT_FORCE_CLAIM_DEPOSIT_ROLE: Hex = idOf("FORCE", "CLAIM", "DEPOSIT", "ROLE");
export const VAULT_RECOVERY_ROLE: Hex = idOf("RECOVERY", "ROLE");
export const VAULT_SET_IPFS_HASH_ROLE: Hex = idOf("SET", "IPFS", "HASH", "ROLE");
export const VAULT_UPDATE_SYNC_SILO_ROLE: Hex = idOf("UPDATE", "SYNC", "SILO", "ROLE");
export const VAULT_UPDATE_NEW_REDEEM_SILO_ROLE: Hex = idOf(
  "UPDATE",
  "NEW",
  "REDEEM",
  "SILO",
  "ROLE",
);
export const VAULT_UPDATE_NEW_DEPOSIT_SILO_ROLE: Hex = idOf(
  "UPDATE",
  "NEW",
  "DEPOSIT",
  "SILO",
  "ROLE",
);

/** T3tris PROTOCOL contract roles (T3tris.sol, not the vault). Deployment,
 * defaults, global pause and upgrades — inspection only from a vault. */
export const T3TRIS_DEPLOY_VAULT_WITH_EXTRA_PARAMS_ROLE: Hex = idOf(
  "DEPLOY",
  "VAULT",
  "WITH",
  "EXTRA",
  "PARAMS",
  "ROLE",
);
export const T3TRIS_DEPLOY_SILO_WITH_CUSTOM_STRATEGY_ROLE: Hex = idOf(
  "DEPLOY",
  "SILO",
  "WITH",
  "CUSTOM",
  "STRATEGY",
  "ROLE",
);
export const T3TRIS_ADD_VAULT_IMPLEMENTATION_ROLE: Hex = idOf(
  "ADD",
  "VAULT",
  "IMPLEMENTATION",
  "ROLE",
);
export const T3TRIS_SET_VERSION_WHITELIST_ROLE: Hex = idOf("SET", "VERSION", "WHITELIST", "ROLE");
export const T3TRIS_SET_DEFAULT_STRATEGY_GENERATOR_ROLE: Hex = idOf(
  "SET",
  "DEFAULT",
  "STRATEGY",
  "GENERATOR",
  "ROLE",
);
export const T3TRIS_SET_T3TREASURY_ROLE: Hex = idOf("SET", "T3TREASURY", "ROLE");
export const T3TRIS_SET_DEFAULT_SILO_ROLE: Hex = idOf("SET", "DEFAULT", "SILO", "ROLE");
export const T3TRIS_SET_DEFAULT_GOVERNANCE_OWNER_ROLE: Hex = idOf(
  "SET",
  "DEFAULT",
  "GOVERNANCE",
  "OWNER",
  "ROLE",
);
export const T3TRIS_PAUSE_PROTOCOL_ROLE: Hex = idOf("PAUSE", "PROTOCOL", "ROLE");
export const T3TRIS_UNPAUSE_PROTOCOL_ROLE: Hex = idOf("UNPAUSE", "PROTOCOL", "ROLE");
export const T3TRIS_PAUSE_VAULTS_ROLE: Hex = idOf("PAUSE", "VAULTS", "ROLE");
export const T3TRIS_UNPAUSE_VAULTS_ROLE: Hex = idOf("UNPAUSE", "VAULTS", "ROLE");
export const T3TRIS_UPGRADE_ROLE: Hex = idOf("UPGRADE", "ROLE");

/** SafeOracle roles (the oracle has its OWN AccessControl, not the vault's). */
export const ORACLE_SET_TOTAL_ASSETS_ROLE: Hex = idOf("SET", "TOTAL", "ASSETS");
export const ORACLE_ADMIN_SET_TOTAL_ASSETS_ROLE: Hex = idOf("ADMIN", "SET", "TOTAL", "ASSETS");
export const ORACLE_SET_MAX_PPS_DEVIATION_UP_ROLE: Hex = idOf(
  "SET",
  "MAX",
  "PPS",
  "DEVIATION",
  "UP",
);
export const ORACLE_ADMIN_SET_MAX_PPS_DEVIATION_UP_ROLE: Hex = idOf(
  "ADMIN",
  "SET",
  "MAX",
  "PPS",
  "DEVIATION",
  "UP",
);
export const ORACLE_SET_MAX_PPS_DEVIATION_DOWN_ROLE: Hex = idOf(
  "SET",
  "MAX",
  "PPS",
  "DEVIATION",
  "DOWN",
);
export const ORACLE_ADMIN_SET_MAX_PPS_DEVIATION_DOWN_ROLE: Hex = idOf(
  "ADMIN",
  "SET",
  "MAX",
  "PPS",
  "DEVIATION",
  "DOWN",
);

export interface Target {
  readonly vault: Address;
  readonly chainId: number;
}

const builders = {
  grant: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.vault, encodeRole("grant", i.role, i.account)),
  revoke: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.vault, encodeRole("revoke", i.role, i.account)),
  renounceRole: (i: Target & { role: Hex; account: Address }) =>
    txFlow(i.chainId, i.vault, encodeRole("renounce", i.role, i.account)),

  /** Grant many roles to one account in a single multicall. Roles are granted
   * in the given order — pass admin roles before their leaves. */
  grantAll: (i: Target & { account: Address; roles: readonly Hex[] }) => {
    if (i.roles.length === 0) throw new Error("curate.roles: grantAll requires at least one role");
    const subcalls = i.roles.map((role) => encodeRole("grant", role, i.account));
    return txFlow(i.chainId, i.vault, encodeMulticall(subcalls));
  },

  /** Grant many (role, account) pairs in ONE multicall — admins first so every
   * leaf grant is authorised by an admin installed earlier in the same tx. */
  grantBatch: (i: Target & { calls: readonly { role: Hex; account: Address }[] }) => {
    if (i.calls.length === 0)
      throw new Error("curate.roles: grantBatch requires at least one call");
    const subcalls = i.calls.map((c) => encodeRole("grant", c.role, c.account));
    return txFlow(i.chainId, i.vault, encodeMulticall(subcalls));
  },

  /** Revoke many (role, account) pairs in ONE multicall (the per-wallet diff). */
  revokeBatch: (i: Target & { calls: readonly { role: Hex; account: Address }[] }) => {
    if (i.calls.length === 0)
      throw new Error("curate.roles: revokeBatch requires at least one call");
    const subcalls = i.calls.map((c) => encodeRole("revoke", c.role, c.account));
    return txFlow(i.chainId, i.vault, encodeMulticall(subcalls));
  },

  // 2-step admin handover
  initGrantAdminRole: (i: Target & { account: Address; role: Hex }) =>
    txFlow(i.chainId, i.vault, encodeRole("initGrantAdmin", i.account, i.role)),
  acceptAdminRole: (i: Target & { role: Hex }) =>
    txFlow(i.chainId, i.vault, encodeRole("acceptAdmin", i.role)),
  cancelGrantAdminRole: (i: Target & { role: Hex }) =>
    txFlow(i.chainId, i.vault, encodeRole("cancelGrantAdmin", i.role)),
  applyAdminBurn: (i: Target & { role: Hex }) =>
    txFlow(i.chainId, i.vault, encodeRole("applyAdminBurn", i.role)),
};

/** Encode one roles-table op by name (keeps the builder map free of repeated
 * selector plumbing while staying typed against the table). */
function encodeRole(op: keyof typeof curateRoles, ...args: readonly unknown[]): Hex {
  return encodeCall(curateRoles[op], args);
}

/** Build the `curate.roles` namespace: writes + membership reads. */
export function makeRoleActions(clients: OnchainClients) {
  const read = {
    has: async (i: { vault: Address; role: Hex; account: Address }) =>
      (
        await readCall<readonly [boolean]>(curateRoles.has, clients.publicClient, {
          address: i.vault,
          args: [i.role, i.account],
        })
      )[0],
    adminOf: async (i: { vault: Address; role: Hex }) =>
      (
        await readCall<readonly [Hex]>(curateRoles.adminOf, clients.publicClient, {
          address: i.vault,
          args: [i.role],
        })
      )[0],
    memberCount: async (i: { vault: Address; role: Hex }) =>
      (
        await readCall<readonly [bigint]>(curateRoles.memberCount, clients.publicClient, {
          address: i.vault,
          args: [i.role],
        })
      )[0],
    members: async (i: { vault: Address; role: Hex }) =>
      (
        await readCall<readonly [readonly Address[]]>(curateRoles.members, clients.publicClient, {
          address: i.vault,
          args: [i.role],
        })
      )[0],
    defaultAdminRole: async (i: { vault: Address }) =>
      (
        await readCall<readonly [Hex]>(curateRoles.defaultAdminRole, clients.publicClient, {
          address: i.vault,
          args: [],
        })
      )[0],
    nextDefaultAdminRecipient: async (i: { vault: Address }) =>
      (
        await readCall<readonly [Address]>(
          curateRoles.nextDefaultAdminRecipient,
          clients.publicClient,
          { address: i.vault, args: [] },
        )
      )[0],
    nextGovernanceAdminRecipient: async (i: { vault: Address }) =>
      (
        await readCall<readonly [Address]>(
          curateRoles.nextGovernanceAdminRecipient,
          clients.publicClient,
          { address: i.vault, args: [] },
        )
      )[0],
  };
  return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
