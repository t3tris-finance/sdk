import { type Address, type Hex } from "viem";
import type { AbiParam } from "./calls.js";
import { type ErrorCode } from "./errors.js";
export interface TransactionResult {
    /** A contract wallet may return a proposal identifier, not a mined transaction. */
    status: "submitted" | "proposed";
    hash: Hex;
}
export interface WalletClientSource {
    account?: {
        address: Address;
    };
    getChainId(): Promise<number>;
    getAddresses(): Promise<Address[]>;
    sendTransaction(args: {
        account: Address;
        to: Address;
        data: Hex;
        chain: null;
    }): Promise<Hex>;
}
export interface PublicClientSource {
    getChainId(): Promise<number>;
    call(args: {
        account?: Address;
        to: Address;
        data: Hex;
        blockNumber?: bigint;
    }): Promise<{
        data?: Hex;
    }>;
    getCode(args: {
        address: Address;
    }): Promise<Hex | undefined>;
}
export interface OnchainClients {
    walletClient: WalletClientSource;
    publicClient: PublicClientSource;
}
export interface TransactionInput {
    chainId: number;
    to: Address;
    data: Hex;
}
export declare class PlatformActionError extends Error {
    readonly code: ErrorCode | undefined;
    readonly selector: Hex | undefined;
    readonly revertData: Hex | undefined;
    constructor(params: {
        code?: ErrorCode;
        selector?: Hex;
        revertData?: Hex;
        message?: string;
        cause?: unknown;
    });
}
export declare class ActionCancelledError extends Error {
    constructor();
}
export declare class ChainMismatchError extends Error {
    readonly expectedChainId: number;
    readonly actualChainId: number;
    constructor(expectedChainId: number, actualChainId: number);
}
export declare function assertChain(client: {
    getChainId(): Promise<number>;
}, chainId: number): Promise<void>;
export declare function requireAccount(wallet: WalletClientSource): Address;
/** One simulation and one send. Never connects, switches, approves, signs permits, retries, or waits for a receipt. */
export declare function submitTransaction(clients: OnchainClients, input: TransactionInput): Promise<TransactionResult>;
export declare function encodeCall(spec: {
    sel: Hex;
    in: readonly AbiParam[];
}, args: readonly unknown[]): Hex;
export declare function readCall<O extends readonly unknown[]>(spec: {
    sel: Hex;
    in: readonly AbiParam[];
    out: readonly AbiParam[];
}, client: Pick<PublicClientSource, "call">, params: {
    address: Address;
    args: readonly unknown[];
}): Promise<O>;
