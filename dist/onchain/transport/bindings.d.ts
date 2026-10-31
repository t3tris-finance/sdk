import type { Address, Hex } from "viem";
import { type OnchainClients, type TransactionInput, type TransactionResult } from "./engine.js";
export type ActionBuilders = Record<string, (input: never) => TransactionInput>;
export type Actions<B extends ActionBuilders> = {
    [K in keyof B]: (input: Parameters<B[K]>[0]) => Promise<TransactionResult>;
};
export declare function bindActions<B extends ActionBuilders>(clients: OnchainClients, builders: B): Actions<B>;
export type Reads<R extends Record<string, (input: never) => Promise<unknown>>> = {
    [K in keyof R]: (input: Parameters<R[K]>[0] & {
        chainId: number;
    }) => ReturnType<R[K]>;
};
export declare function bindReads<R extends Record<string, (input: never) => Promise<unknown>>>(clients: OnchainClients, reads: R): Reads<R>;
export declare function transaction(chainId: number, to: Address, data: Hex): TransactionInput;
export declare function encodeMulticall(subcalls: readonly Hex[]): Hex;
