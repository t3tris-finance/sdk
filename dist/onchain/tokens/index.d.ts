import type { Address } from "viem";
import { type OnchainClients } from "../transport/engine.js";
export declare function makeTokenActions(clients: OnchainClients): {
    balanceOf: (input: {
        token: Address;
        owner: Address;
    } & {
        chainId: number;
    }) => Promise<bigint>;
    allowance: (input: {
        token: Address;
        owner: Address;
        spender: Address;
    } & {
        chainId: number;
    }) => Promise<bigint>;
    approve: (input: {
        chainId: number;
        token: Address;
        spender: Address;
        amount: bigint;
    }) => Promise<import("../index.js").TransactionResult>;
};
