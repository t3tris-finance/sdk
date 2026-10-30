/**
 * SafeOracle actions and reads: NAV push
 * (`setTotalAssets`), the up/down price-per-share deviation bounds, the OZ
 * `AccessControlDefaultAdminRules` 2-step admin transfer, and the role
 * grant/revoke/renounce trio.
 *
 * NOTE: the call-table op names are `setMaxDeviationUp` / `setMaxDeviationDown`
 * (the on-chain `setMaxPricePerShareDeviation{Up,Down}Wad`).
 */
import { curateOracle } from "../abi/admin.js";
import { bindActions, bindReads, encodeMulticall, transaction as txFlow, } from "../transport/bindings.js";
import { encodeCall, readCall } from "../transport/engine.js";
const builders = {
    /** Push a fresh NAV (total assets) — the core valuation write. */
    setTotalAssets: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setTotalAssets, [i.totalAssets])),
    // price-per-share deviation bounds
    setMaxPricePerShareDeviationUpWad: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setMaxDeviationUp, [i.wad])),
    setMaxPricePerShareDeviationDownWad: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.setMaxDeviationDown, [i.wad])),
    // 2-step default-admin transfer
    beginDefaultAdminTransfer: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.beginAdminTransfer, [i.newAdmin])),
    acceptDefaultAdminTransfer: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.acceptAdminTransfer, [])),
    cancelDefaultAdminTransfer: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.cancelAdminTransfer, [])),
    changeDefaultAdminDelay: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.changeAdminDelay, [i.newDelay])),
    rollbackDefaultAdminDelay: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.rollbackAdminDelay, [])),
    // roles
    grant: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.grant, [i.role, i.account])),
    revoke: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.revoke, [i.role, i.account])),
    renounce: (i) => txFlow(i.chainId, i.oracle, encodeCall(curateOracle.renounce, [i.role, i.account])),
    /** Apply a batch of role changes on the oracle in ONE multicall. Mixed ops
     * are allowed so a full-manager grant can bootstrap a family the owner lacks:
     * an admin self-grant, the action-leaf grant to the target, then the admin
     * self-revoke — all atomic (Solady `multicall` delegatecalls, so `msg.sender`
     * stays the owner). Order is load-bearing: admin grants precede the leaf
     * grants they authorise. */
    applyRoles: (i) => {
        if (i.calls.length === 0) {
            throw new Error("curate.oracle: applyRoles requires at least one call");
        }
        const subcalls = i.calls.map((c) => encodeCall(c.op === "grant" ? curateOracle.grant : curateOracle.revoke, [c.role, c.account]));
        return txFlow(i.chainId, i.oracle, encodeMulticall(subcalls));
    },
};
/** Build the `curate.oracle` namespace: writes + reads. */
export function makeOracleActions(clients) {
    const read = {
        totalAssets: async (i) => (await readCall(curateOracle.totalAssets, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        maxDeviationUp: async (i) => (await readCall(curateOracle.maxDeviationUp, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        maxDeviationDown: async (i) => (await readCall(curateOracle.maxDeviationDown, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        admin: async (i) => (await readCall(curateOracle.admin, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        defaultAdminDelay: async (i) => (await readCall(curateOracle.defaultAdminDelay, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        pendingAdmin: async (i) => {
            const [pending, delay] = await readCall(curateOracle.pendingAdmin, clients.publicClient, { address: i.oracle, args: [] });
            return { pending, delay };
        },
        owner: async (i) => (await readCall(curateOracle.owner, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
        has: async (i) => (await readCall(curateOracle.has, clients.publicClient, {
            address: i.oracle,
            args: [i.role, i.account],
        }))[0],
        /** Last PPS saved by a valuation — the deviation-check anchor (0 before the first). */
        lastSavedPps: async (i) => (await readCall(curateOracle.lastSavedPps, clients.publicClient, {
            address: i.oracle,
            args: [],
        }))[0],
    };
    return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
