import { erc20 } from "../abi/vault.js";
import { bindActions, bindReads } from "../transport/bindings.js";
import { encodeCall, readCall } from "../transport/engine.js";
export function makeTokenActions(clients) {
    return {
        ...bindActions(clients, {
            approve: (i) => ({
                chainId: i.chainId,
                to: i.token,
                data: encodeCall(erc20.approve, [i.spender, i.amount]),
            }),
        }),
        ...bindReads(clients, {
            balanceOf: async (i) => (await readCall(erc20.balanceOf, clients.publicClient, {
                address: i.token,
                args: [i.owner],
            }))[0],
            allowance: async (i) => (await readCall(erc20.allowance, clients.publicClient, {
                address: i.token,
                args: [i.owner, i.spender],
            }))[0],
        }),
    };
}
