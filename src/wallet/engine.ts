/**
 * The engine — drives a declarative `Step[]` against the wallet client the
 * caller passes: chain gate → allowance gate (approve only when short) → optional
 * EIP-712 signature → simulated + sent + confirmed tx. Clean port of the
 * legacy `internal/chain.ts`; smart-contract accounts (Safe & co) stop at
 * `proposed`, EOAs wait for the receipt. A mined-but-reverted tx is
 * re-simulated at its own block to tell a contract revert from out-of-gas.
 */

import {
  type AbiParameter,
  type Address,
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  type Hex,
  maxUint160,
  maxUint256,
  type TypedData,
  type TypedDataDomain,
} from "viem";
import type { AbiParam } from "./calls";
import { erc20 } from "./calls";
import { type ErrorCode, errorCodeOf } from "./errors";
import {
  buildPermitSingleTypedData,
  encodePermit2Data,
  PERMIT2_ADDRESS,
  type PermitSingle,
  permitDeadlines,
  readPermit2Allowance,
} from "./permit2";

// ---------------------------------------------------------------------------
// clients — a viem or wagmi wallet client satisfies these after bindEngineClients
// ---------------------------------------------------------------------------

export interface EngineReceipt {
  status: "success" | "reverted";
  blockNumber: bigint;
  transactionHash: Hex;
}

export interface EnginePublicClient {
  call(args: {
    account?: Address;
    to: Address;
    data: Hex;
    blockNumber?: bigint;
  }): Promise<{ data?: Hex }>;
  getCode(args: { address: Address }): Promise<Hex | undefined>;
  getBlock(args?: { blockTag?: "latest" }): Promise<{ timestamp: bigint }>;
  waitForTransactionReceipt(args: { hash: Hex }): Promise<EngineReceipt>;
}

export interface EngineWalletClient {
  account?: { address: Address };
  getChainId(): Promise<number>;
  switchChain(args: { id: number }): Promise<void>;
  sendTransaction(args: { account?: Address; to: Address; data: Hex; chain?: null }): Promise<Hex>;
  signTypedData(args: {
    account?: Address;
    domain: TypedDataDomain;
    types: TypedData;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<Hex>;
}

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

/** A revert the engine decoded into a produced `E_*` code (or a bare
 *  selector when unknown). Raw provider internals never surface. */
export class PlatformActionError extends Error {
  readonly code: ErrorCode | undefined;
  readonly selector: Hex | undefined;
  readonly revertData: Hex | undefined;
  constructor(params: {
    code?: ErrorCode;
    selector?: Hex;
    revertData?: Hex;
    message?: string;
    cause?: unknown;
  }) {
    super(params.message ?? params.code ?? params.selector ?? "action reverted", {
      cause: params.cause,
    });
    this.name = "PlatformActionError";
    this.code = params.code;
    this.selector = params.selector;
    this.revertData = params.revertData;
  }
}

/** User-rejected signature/tx, or a dropped/cancelled tx — callers reset
 *  silently instead of showing an error. */
export class ActionCancelledError extends Error {
  constructor(message = "action cancelled") {
    super(message);
    this.name = "ActionCancelledError";
  }
}

// ---------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------

export type Step =
  | { kind: "requireChain"; chainId: number }
  | {
      kind: "fundCurator";
      id: string;
      build: (ctx: StepCtx) => Promise<CuratorFundingRequirement>;
    }
  | {
      kind: "requireAllowance";
      token: Address;
      owner: Address;
      spender: Address;
      amount: bigint;
      approveAmount?: "max" | bigint;
    }
  | {
      kind: "signTypedData";
      id: string;
      build: (ctx: StepCtx) => TypedDataRequest | Promise<TypedDataRequest>;
    }
  | {
      kind: "tx";
      to: Address;
      value?: bigint;
      data: Hex | ((ctx: StepCtx) => Hex | Promise<Hex>);
    };

export interface CuratorFundingRequirement {
  token: Address;
  curator: Address;
  vault: Address;
  amount: bigint;
  chainId: number;
}

export interface TypedDataRequest {
  chainId?: number;
  domain: TypedDataDomain;
  types: TypedData;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface StepCtx {
  account: Address;
  publicClient: EnginePublicClient;
  chainTimestamp(): Promise<bigint>;
  signature(id: string): Hex | undefined;
  fundingPayload(id: string): Hex;
}

/** Lifecycle beats surfaced through `onStatus` — the panel's step rail. */
export type EngineStatus =
  | "checking"
  | "switching"
  | "approving"
  | "signing"
  | "simulating"
  | "confirming"
  | "confirmed"
  | "proposed";

export type ExecuteResult =
  | { status: "confirmed"; hash: Hex; receipt: EngineReceipt }
  | { status: "proposed"; hash: Hex };

export interface ExecuteOptions {
  walletClient: EngineWalletClient;
  publicClient: EnginePublicClient;
  onStatus?: (status: EngineStatus) => void;
}

// ---------------------------------------------------------------------------
// execute
// ---------------------------------------------------------------------------

export async function execute(
  steps: readonly Step[],
  opts: ExecuteOptions,
): Promise<ExecuteResult> {
  const { walletClient, publicClient, onStatus } = opts;
  const account = requireAccount(walletClient);
  // Every write flow declares its chain. Switch before *any* network read,
  // including the smart-wallet probe, allowance checks and tx simulation.
  const firstStep = steps[0];
  if (
    firstStep?.kind !== "requireChain" ||
    steps.slice(1).some((step) => step.kind === "requireChain")
  ) {
    throw new PlatformActionError({ message: "write flow must start with one target chain" });
  }
  const targetChainId = firstStep.chainId;
  onStatus?.("checking");
  if ((await walletClient.getChainId()) !== targetChainId) {
    onStatus?.("switching");
    await walletClient.switchChain({ id: targetChainId });
  }
  if ((await walletClient.getChainId()) !== targetChainId) {
    throw new PlatformActionError({ message: "wallet did not switch to the target chain" });
  }
  const safe = await probeSafe(publicClient, account);
  const scratch = new Map<string, Hex>();
  const funding = new Map<string, Hex>();
  let curatorFunding: CuratorFundingRequirement | undefined;
  const ctx: StepCtx = {
    account,
    publicClient,
    chainTimestamp: async () => (await publicClient.getBlock({ blockTag: "latest" })).timestamp,
    signature: (id) => scratch.get(id),
    fundingPayload: (id) => funding.get(id) ?? "0x",
  };

  let last: ExecuteResult | undefined;

  for (const step of steps) {
    switch (step.kind) {
      case "requireChain":
        break;
      case "fundCurator": {
        const requirement = await step.build(ctx);
        if (requirement.chainId !== targetChainId) {
          throw new PlatformActionError({
            message: "funding chain does not match the write chain",
          });
        }
        const prepared = await prepareCuratorFunding(requirement, account, safe, opts);
        if (prepared.status === "proposed") return prepared.result;
        funding.set(step.id, prepared.payload);
        curatorFunding = requirement;
        break;
      }
      case "requireAllowance": {
        onStatus?.("checking");
        if (await allowanceMet(publicClient, step)) break;
        onStatus?.("approving");
        const data = encodeCall(erc20.approve, [step.spender, resolveApproveValue(step)]);
        const approval = await sendAndConfirm({ to: step.token, data }, account, safe, opts);
        // A Safe proposal is not an on-chain allowance yet. Never submit the
        // deposit against it; the user can retry once the proposal executes.
        if (approval.status === "proposed") return approval;
        await waitForAllowance(publicClient, step);
        break;
      }
      case "signTypedData": {
        onStatus?.("signing");
        const req = await step.build(ctx);
        const sig = await signOrCancel(walletClient, account, req);
        scratch.set(step.id, sig);
        break;
      }
      case "tx": {
        onStatus?.("simulating");
        let data = await resolveData(step.data, ctx);
        // Only a failed Permit2 preflight can trigger the native-allowance
        // fallback. A rejection during send must never request another approval.
        if (curatorFunding !== undefined && [...funding.values()].some((v) => v !== "0x")) {
          try {
            await publicClient.call({
              account,
              to: step.to,
              data,
              ...(step.value !== undefined ? { value: step.value } : {}),
            });
          } catch (error) {
            if (isUserRejection(error)) throw new ActionCancelledError();
            const fallback = await approveCuratorNative(curatorFunding, account, safe, opts);
            if (fallback.status === "proposed") return fallback.result;
            for (const id of funding.keys()) funding.set(id, "0x");
            data = await resolveData(step.data, ctx);
          }
        }
        last = await sendAndConfirm(
          { to: step.to, data, ...(step.value !== undefined ? { value: step.value } : {}) },
          account,
          safe,
          opts,
        );
        if (last.status === "proposed") return last;
        break;
      }
    }
  }

  if (last === undefined) {
    throw new PlatformActionError({ message: "flow has no terminal transaction" });
  }
  return last;
}

export function requireAccount(walletClient: EngineWalletClient): Address {
  const account = walletClient.account?.address;
  if (account === undefined) throw new PlatformActionError({ message: "no connected account" });
  return account;
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

interface RawTx {
  to: Address;
  data: Hex;
  value?: bigint;
}

/** Curator top-ups are pulled from the configured curator, never an arbitrary operator. */
async function prepareCuratorFunding(
  requirement: CuratorFundingRequirement,
  account: Address,
  safe: boolean,
  opts: ExecuteOptions,
): Promise<{ status: "ready"; payload: Hex } | { status: "proposed"; result: ExecuteResult }> {
  const { token, curator, vault, amount, chainId } = requirement;
  if (amount === 0n) return { status: "ready", payload: "0x" };
  const { publicClient, walletClient, onStatus } = opts;
  onStatus?.("checking");
  const native = {
    kind: "requireAllowance",
    token,
    owner: curator,
    spender: vault,
    amount,
  } as const;
  if (await allowanceMet(publicClient, native)) return { status: "ready", payload: "0x" };
  if (account.toLowerCase() !== curator.toLowerCase()) {
    throw new PlatformActionError({ message: "Connect the curator wallet to fund this action." });
  }

  const approveNative = () => approveCuratorNative(requirement, account, safe, opts);

  // Try the connected wallet's typed-data path for EOAs and contract wallets.
  // A Safe's signature still needs to pass Permit2's EIP-1271 check; the
  // settlement preflight below falls back to native allowance if it cannot.
  if (amount > maxUint160) return approveNative();

  try {
    const permit2Allowance = {
      kind: "requireAllowance",
      token,
      owner: curator,
      spender: PERMIT2_ADDRESS,
      amount,
    } as const;
    if (!(await allowanceMet(publicClient, permit2Allowance))) {
      onStatus?.("approving");
      const approval = await sendAndConfirm(
        { to: token, data: encodeCall(erc20.approve, [PERMIT2_ADDRESS, maxUint256]) },
        account,
        safe,
        opts,
      );
      if (approval.status === "proposed") return { status: "proposed", result: approval };
      await waitForAllowance(publicClient, permit2Allowance);
    }
    const { nonce } = await readPermit2Allowance(publicClient, {
      owner: curator,
      token,
      spender: vault,
    });
    const { expiration, sigDeadline } = permitDeadlines(
      Number((await publicClient.getBlock({ blockTag: "latest" })).timestamp),
    );
    const permit: PermitSingle = {
      details: { token, amount, expiration, nonce },
      spender: vault,
      sigDeadline,
    };
    const typed = buildPermitSingleTypedData(permit, chainId);
    onStatus?.("signing");
    const signature = await signOrCancel(walletClient, account, { chainId, ...typed });
    return { status: "ready", payload: encodePermit2Data(permit, signature) };
  } catch (err) {
    if (err instanceof ActionCancelledError) throw err;
    // A Safe EIP-1271 signature may not be executable until its owners have
    // approved it on-chain. Native approval is the recoverable route here.
    // Do not mistake an approval proposal for an executed allowance.
    return approveNative();
  }
}

async function approveCuratorNative(
  requirement: CuratorFundingRequirement,
  account: Address,
  safe: boolean,
  opts: ExecuteOptions,
): Promise<{ status: "ready"; payload: Hex } | { status: "proposed"; result: ExecuteResult }> {
  const { publicClient, onStatus } = opts;
  const { token, curator, vault, amount } = requirement;
  const native = {
    kind: "requireAllowance",
    token,
    owner: curator,
    spender: vault,
    amount,
  } as const;
  if (await allowanceMet(publicClient, native)) return { status: "ready", payload: "0x" };
  onStatus?.("approving");
  const approval = await sendAndConfirm(
    { to: token, data: encodeCall(erc20.approve, [vault, maxUint256]) },
    account,
    safe,
    opts,
  );
  if (approval.status === "proposed") return { status: "proposed", result: approval };
  await waitForAllowance(publicClient, native);
  return { status: "ready", payload: "0x" };
}

async function sendAndConfirm(
  tx: RawTx,
  account: Address,
  safe: boolean,
  opts: ExecuteOptions,
): Promise<ExecuteResult> {
  const { walletClient, publicClient, onStatus } = opts;

  // Pre-flight: a reverting eth_call means the send is doomed — surface the
  // decoded code now instead of asking the wallet to sign a dead tx.
  try {
    await publicClient.call({ account, ...tx });
  } catch (err) {
    if (isUserRejection(err)) throw new ActionCancelledError();
    throw revertToError(err);
  }

  let hash: Hex;
  try {
    hash = await walletClient.sendTransaction({ account, chain: null, ...tx });
  } catch (err) {
    if (isUserRejection(err)) throw new ActionCancelledError();
    // Some wallets fail during the send itself rather than the pre-flight call.
    // Preserve their revert bytes, but don't mislabel unrelated RPC failures.
    if (extractSelector(err) !== undefined) throw revertToError(err);
    throw err;
  }

  // Smart-contract wallets: the "hash" is a proposal that never mines here.
  if (safe) {
    onStatus?.("proposed");
    return { status: "proposed", hash };
  }

  onStatus?.("confirming");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw await diagnoseRevert(publicClient, account, tx, receipt);
  }

  onStatus?.("confirmed");
  return { status: "confirmed", hash, receipt };
}

async function diagnoseRevert(
  publicClient: EnginePublicClient,
  account: Address,
  tx: RawTx,
  receipt: EngineReceipt,
): Promise<PlatformActionError> {
  try {
    await publicClient.call({ account, ...tx, blockNumber: receipt.blockNumber });
  } catch (err) {
    return revertToError(err);
  }
  return new PlatformActionError({
    message: "transaction reverted without revert data (likely out-of-gas)",
  });
}

function revertToError(err: unknown): PlatformActionError {
  const revertData = findRevertData(err);
  const selector =
    revertData === undefined ? undefined : (revertData.slice(0, 10).toLowerCase() as Hex);
  const code = selector !== undefined ? errorCodeOf(selector) : undefined;
  return new PlatformActionError({
    ...(code !== undefined ? { code } : {}),
    ...(selector !== undefined ? { selector } : {}),
    ...(revertData !== undefined ? { revertData } : {}),
    ...(selector === undefined
      ? { message: "Contract call failed without usable revert data." }
      : {}),
    cause: err,
  });
}

async function signOrCancel(
  walletClient: EngineWalletClient,
  account: Address,
  req: TypedDataRequest,
): Promise<Hex> {
  try {
    return await walletClient.signTypedData({
      account,
      domain: req.domain,
      types: req.types,
      primaryType: req.primaryType,
      message: req.message,
    });
  } catch (err) {
    if (isUserRejection(err)) throw new ActionCancelledError();
    throw err;
  }
}

/** Probe bytecode once per account: a smart-contract account short-circuits
 *  to `proposed`. EIP-7702-delegated EOAs broadcast like EOAs and are excluded. */
const safeCache = new Map<string, boolean>();

async function probeSafe(publicClient: EnginePublicClient, account: Address): Promise<boolean> {
  const key = account.toLowerCase();
  const cached = safeCache.get(key);
  if (cached !== undefined) return cached;
  let result = false;
  try {
    const code = await publicClient.getCode({ address: account });
    result = code !== undefined && code !== "0x" && !isEip7702Delegation(code);
  } catch {
    result = false;
  }
  safeCache.set(key, result);
  return result;
}

const isEip7702Delegation = (code: Hex): boolean =>
  code.length === 48 && code.toLowerCase().startsWith("0xef0100");

function resolveApproveValue(step: Extract<Step, { kind: "requireAllowance" }>): bigint {
  if (step.approveAmount === "max") return maxUint256;
  return step.approveAmount ?? step.amount;
}

async function waitForAllowance(
  publicClient: EnginePublicClient,
  step: Extract<Step, { kind: "requireAllowance" }>,
): Promise<void> {
  // A receipt may arrive before a different RPC replica serves the new state.
  // Only continue to the funding transaction after the allowance is visible.
  for (let attempt = 0; attempt < 10; attempt++) {
    if (await allowanceMet(publicClient, step)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
  throw new PlatformActionError({
    message: "Approval confirmed but allowance has not updated. Retry the deposit.",
  });
}

async function allowanceMet(
  publicClient: EnginePublicClient,
  step: Extract<Step, { kind: "requireAllowance" }>,
): Promise<boolean> {
  const [current] = await readCall<readonly unknown[]>(erc20.allowance, publicClient, {
    address: step.token,
    args: [step.owner, step.spender],
  });
  return (current as bigint) >= step.amount;
}

async function resolveData(
  data: Hex | ((ctx: StepCtx) => Hex | Promise<Hex>),
  ctx: StepCtx,
): Promise<Hex> {
  return typeof data === "function" ? data(ctx) : data;
}

// ---------------------------------------------------------------------------
// encode / decode helpers
// ---------------------------------------------------------------------------

const asParams = (p: readonly AbiParam[]): readonly AbiParameter[] => p as readonly AbiParameter[];

/** selector ‖ ABI-encoded positional args. */
export function encodeCall(
  spec: { sel: Hex; in: readonly AbiParam[] },
  args: readonly unknown[],
): Hex {
  if (spec.in.length === 0) return spec.sel;
  return concatHex([spec.sel, encodeAbiParameters(asParams(spec.in), args as readonly never[])]);
}

export async function readCall<O extends readonly unknown[]>(
  spec: { sel: Hex; in: readonly AbiParam[]; out: readonly AbiParam[] },
  client: EnginePublicClient,
  params: { address: Address; args: readonly unknown[] },
): Promise<O> {
  const data = encodeCall(spec, params.args);
  const res = await client.call({ to: params.address, data });
  // A void call has no `out` params, so the empty tuple is the only correct
  // result — `O` is the caller's declared output tuple for that op.
  if (spec.out.length === 0) {
    // SAFETY: `O` is constrained to `readonly unknown[]`, so the empty tuple is
    // a valid value for a void op; TypeScript cannot express that generically.
    return [] as unknown as O;
  }
  // Fail with an actionable read error before viem's decoder sees malformed
  // provider output. `createEngineClients` supplies the hex `result.data`.
  if (typeof res.data !== "string" || !res.data.startsWith("0x") || res.data.length < 2) {
    throw new PlatformActionError({ message: "call returned no ABI data" });
  }
  return decodeAbiParameters(asParams(spec.out), res.data) as O;
}
// ---------------------------------------------------------------------------
// revert decoding
// ---------------------------------------------------------------------------

// Standard ABI errors are a four-byte selector followed by zero or more ABI
// words. A 20-byte account address (or a 32-byte tx hash) is not revert data.
const REVERT_DATA = /^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{64})*$/;

function extractSelector(err: unknown): Hex | undefined {
  const data = findRevertData(err);
  return data === undefined ? undefined : (data.slice(0, 10).toLowerCase() as Hex);
}

function findRevertData(err: unknown, depth = 0): Hex | undefined {
  if (depth > 6 || err === null || typeof err !== "object") return undefined;
  for (const key of ["raw", "data"] as const) {
    const value = readProp(err, key);
    if (typeof value === "string" && REVERT_DATA.test(value)) return value as Hex;
    if (value !== null && typeof value === "object") {
      const nested = findRevertData(value, depth + 1);
      if (nested !== undefined) return nested;
    }
  }
  const cause = findRevertData(readProp(err, "cause"), depth + 1);
  if (cause !== undefined) return cause;
  // Some RPCs only include the payload in a revert-specific message. Never
  // take the first hex string from the generic message: it is often `from`.
  const message = readProp(err, "message");
  if (typeof message === "string") {
    const match = message.match(
      /\b(?:revert(?:ed)?(?:\s+data)?|signature)\s*:\s*["']?(0x[0-9a-fA-F]+)\b/i,
    );
    if (match?.[1] !== undefined && REVERT_DATA.test(match[1])) return match[1] as Hex;
  }
  return undefined;
}

function isUserRejection(err: unknown): boolean {
  const code = readProp(err, "code");
  if (code === 4001) return true;
  const name = String(readProp(err, "name") ?? "");
  if (name.includes("UserRejected")) return true;
  const message = String(readProp(err, "message") ?? "").toLowerCase();
  return message.includes("user rejected") || message.includes("user denied");
}

/** A property read off an unknown provider/error object. The closed union keeps
 * `readProp` from returning `unknown` at its boundary; every caller narrows
 * before use. */
type PropValue = string | number | boolean | object | null | undefined;

function readProp(value: unknown, key: string): PropValue {
  if (value === null || typeof value !== "object") return undefined;
  return (value as Record<string, PropValue>)[key];
}
