import { concatHex, decodeAbiParameters, encodeAbiParameters, } from "viem";
import { errorCodeOf } from "./errors.js";
export class PlatformActionError extends Error {
    code;
    selector;
    revertData;
    constructor(params) {
        super(params.message ?? params.code ?? params.selector ?? "Contract action failed", {
            cause: params.cause,
        });
        this.name = "PlatformActionError";
        this.code = params.code;
        this.selector = params.selector;
        this.revertData = params.revertData;
    }
}
export class ActionCancelledError extends Error {
    constructor() {
        super("Wallet request rejected");
        this.name = "ActionCancelledError";
    }
}
export class ChainMismatchError extends Error {
    expectedChainId;
    actualChainId;
    constructor(expectedChainId, actualChainId) {
        super(`Expected chain ${expectedChainId}, received ${actualChainId}. Switch networks in your app before calling the SDK.`);
        this.expectedChainId = expectedChainId;
        this.actualChainId = actualChainId;
        this.name = "ChainMismatchError";
    }
}
export async function assertChain(client, chainId) {
    const actual = await client.getChainId();
    if (actual !== chainId)
        throw new ChainMismatchError(chainId, actual);
}
export function requireAccount(wallet) {
    const account = wallet.account?.address;
    if (!account)
        throw new Error("Pass a connected walletClient with an account.");
    return account;
}
/** One simulation and one send. Never connects, switches, approves, signs permits, retries, or waits for a receipt. */
export async function submitTransaction(clients, input) {
    const { walletClient, publicClient } = clients;
    const account = requireAccount(walletClient);
    const check = async () => {
        await assertChain(walletClient, input.chainId);
        await assertChain(publicClient, input.chainId);
        const accounts = await walletClient.getAddresses();
        if (walletClient.account?.address.toLowerCase() !== account.toLowerCase() ||
            !accounts.some((address) => address.toLowerCase() === account.toLowerCase())) {
            throw new Error("Wallet account changed. Recreate the client with the connected account.");
        }
    };
    await check();
    // Do not cache by address: bytecode differs across chains and can change.
    const code = await publicClient.getCode({ address: account });
    const proposed = code !== undefined &&
        code !== "0x" &&
        !(code.length === 48 && code.toLowerCase().startsWith("0xef0100"));
    const tx = { account, to: input.to, data: input.data };
    try {
        await publicClient.call(tx);
    }
    catch (error) {
        throw actionError(error);
    }
    await check();
    try {
        const hash = await walletClient.sendTransaction({ ...tx, chain: null });
        return { status: proposed ? "proposed" : "submitted", hash };
    }
    catch (error) {
        throw actionError(error);
    }
}
export function encodeCall(spec, args) {
    if (spec.in.length === 0)
        return spec.sel;
    return concatHex([
        spec.sel,
        encodeAbiParameters(spec.in, args),
    ]);
}
export async function readCall(spec, client, params) {
    const result = await client.call({ to: params.address, data: encodeCall(spec, params.args) });
    // SAFETY: a void ABI result is the empty tuple; O is constrained to a readonly tuple.
    if (spec.out.length === 0)
        return [];
    if (typeof result.data !== "string" || !result.data.startsWith("0x")) {
        throw new PlatformActionError({ message: "Call returned no ABI data" });
    }
    return decodeAbiParameters(spec.out, result.data);
}
const REVERT_DATA = /^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{64})*$/;
function findRevertData(error, depth = 0) {
    if (depth > 6 || typeof error !== "object" || error === null)
        return undefined;
    const record = error;
    for (const key of ["raw", "data", "cause"]) {
        const value = record[key];
        if (key !== "cause" && typeof value === "string" && REVERT_DATA.test(value))
            return value;
        const nested = findRevertData(value, depth + 1);
        if (nested)
            return nested;
    }
    if (typeof record.message === "string") {
        const match = record.message.match(/\b(?:revert(?:ed)?(?:\s+data)?|signature)\s*:\s*["']?(0x[0-9a-fA-F]+)\b/i);
        if (match?.[1] && REVERT_DATA.test(match[1]))
            return match[1];
    }
    return undefined;
}
function actionError(error) {
    if (typeof error === "object" && error !== null) {
        const record = error;
        if (record.code === 4001 ||
            String(record.name).includes("UserRejected") ||
            /user (rejected|denied)/i.test(String(record.message))) {
            return new ActionCancelledError();
        }
    }
    const revertData = findRevertData(error);
    if (revertData) {
        const selector = revertData.slice(0, 10).toLowerCase();
        return new PlatformActionError({
            code: errorCodeOf(selector),
            selector,
            revertData,
            cause: error,
        });
    }
    return error instanceof Error
        ? error
        : new Error("Wallet or RPC request failed", { cause: error });
}
