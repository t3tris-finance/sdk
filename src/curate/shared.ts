/**
 * The curate (vault-admin) module foundation. Every admin action is a pure
 * calldata builder (`input → Step[]`, no network) bound to the injected wallet
 * + public clients by {@link bindActions}; reads are typed wrappers over
 * `readCall` against the same call tables.
 *
 * Mirrors the earn action engine's shape (`../wallet`): no ABI is shipped,
 * writes are simulated with a raw `eth_call` before signing, and reverts are
 * decoded by selector into produced `E_*` error codes.
 */

import type { Address, Hex } from "viem";
import { earn } from "../wallet/calls";
import {
  type EnginePublicClient,
  type EngineStatus,
  type EngineWalletClient,
  type ExecuteResult,
  encodeCall,
  execute,
  type Step,
} from "../wallet/engine";

/** The two clients the engine drives. Pass a viem or wagmi wallet client
 * through `bindEngineClients`, or adapt an EIP-1193 provider with
 * `createEngineClients`. */
export interface CurateClients {
  readonly walletClient: EngineWalletClient;
  readonly publicClient: EnginePublicClient;
}

/** Per-call knobs threaded into `execute` (currently just the status callback). */
export interface RunOptions {
  readonly onStatus?: (status: EngineStatus) => void;
}

/** A pure calldata builder: input → declarative `Step[]` (no network, no signing). */
export type StepBuilder<I> = (input: I) => Step[];

/** A map of named step builders. The `never` input makes any concrete builder
 * assignable, so inference recovers each builder's real input type via
 * `Parameters`. */
export type StepBuilders = Record<string, StepBuilder<never>>;

/** The executing surface: one action per builder, typed to its input. */
export type Actions<B extends StepBuilders> = {
  [K in keyof B]: (input: Parameters<B[K]>[0], opts?: RunOptions) => Promise<ExecuteResult>;
};

/** Bind a builder map to the clients: each entry becomes an action that builds
 * its steps then `execute`s them against the wallet. */
export function bindActions<B extends StepBuilders>(
  clients: CurateClients,
  builders: B,
): Actions<B> {
  const actions: Record<string, unknown> = {};
  for (const key of Object.keys(builders)) {
    const build = builders[key] as StepBuilder<never>;
    // `async` so a synchronous builder guard (e.g. an empty whitelist batch)
    // surfaces as a rejected promise — callers always `await` the action.
    actions[key] = async (input: never, opts?: RunOptions) =>
      execute(build(input), {
        walletClient: clients.walletClient,
        publicClient: clients.publicClient,
        ...(opts?.onStatus !== undefined ? { onStatus: opts.onStatus } : {}),
      });
  }
  return actions as Actions<B>;
}

/** The chain-gate + single-tx flow behind nearly every curate write. */
export function txFlow(chainId: number, to: Address, data: Hex): Step[] {
  return [
    { kind: "requireChain", chainId },
    { kind: "tx", to, data },
  ];
}

/** Solady `multicall(bytes[])` — wrap already-encoded sub-calls into one atomic
 * tx (the vault/roles batch ops). */
export function encodeMulticall(subcalls: readonly Hex[]): Hex {
  return encodeCall(earn.batch, [subcalls]);
}

export type { EngineStatus, ExecuteResult, Step };
