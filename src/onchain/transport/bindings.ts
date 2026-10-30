import type { Address, Hex } from "viem";
import { earn } from "../abi/vault";
import {
  assertChain,
  encodeCall,
  type OnchainClients,
  submitTransaction,
  type TransactionInput,
  type TransactionResult,
} from "./engine";

export type ActionBuilders = Record<string, (input: never) => TransactionInput>;
export type Actions<B extends ActionBuilders> = {
  [K in keyof B]: (input: Parameters<B[K]>[0]) => Promise<TransactionResult>;
};

export function bindActions<B extends ActionBuilders>(
  clients: OnchainClients,
  builders: B,
): Actions<B> {
  const actions: Record<string, unknown> = {};
  for (const key of Object.keys(builders)) {
    const build = builders[key] as (input: never) => TransactionInput;
    actions[key] = async (input: never) => submitTransaction(clients, build(input));
  }
  return actions as Actions<B>;
}

export type Reads<R extends Record<string, (input: never) => Promise<unknown>>> = {
  [K in keyof R]: (input: Parameters<R[K]>[0] & { chainId: number }) => ReturnType<R[K]>;
};

export function bindReads<R extends Record<string, (input: never) => Promise<unknown>>>(
  clients: OnchainClients,
  reads: R,
): Reads<R> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(reads)) {
    const read = reads[key] as (input: never) => Promise<unknown>;
    result[key] = async (input: { chainId: number }) => {
      await assertChain(clients.publicClient, input.chainId);
      return read(input as never);
    };
  }
  return result as Reads<R>;
}

export function transaction(chainId: number, to: Address, data: Hex): TransactionInput {
  return { chainId, to, data };
}

export function encodeMulticall(subcalls: readonly Hex[]): Hex {
  return encodeCall(earn.batch, [subcalls]);
}
