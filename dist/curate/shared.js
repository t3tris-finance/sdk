import { earn } from "../wallet/calls.js";
import { assertChain, encodeCall, submitTransaction, } from "../wallet/engine.js";
export function bindActions(clients, builders) {
    const actions = {};
    for (const key of Object.keys(builders)) {
        const build = builders[key];
        actions[key] = async (input) => submitTransaction(clients, build(input));
    }
    return actions;
}
export function bindReads(clients, reads) {
    const result = {};
    for (const key of Object.keys(reads)) {
        const read = reads[key];
        result[key] = async (input) => {
            await assertChain(clients.publicClient, input.chainId);
            return read(input);
        };
    }
    return result;
}
export function transaction(chainId, to, data) {
    return { chainId, to, data };
}
export function encodeMulticall(subcalls) {
    return encodeCall(earn.batch, [subcalls]);
}
