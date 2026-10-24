/**
 * Depositor action flows — each builds the `Step[]` the engine drives
 * (requireChain → permit2-sign OR native-approve → tx). Clean port of the
 * legacy `earn/flows.ts`; the funding default stays permit2. Amounts are raw
 * on-chain integers; the SDK resolves the vault's asset / claimable legs via
 * reads so callers pass the minimum.
 */

import type { Address, Hex, TypedData } from "viem";
import { earn } from "./calls";
import {
  type EnginePublicClient,
  type EngineWalletClient,
  encodeCall,
  PlatformActionError,
  readCall,
  requireAccount,
  type Step,
  type StepCtx,
} from "./engine";
import {
  buildPermitSingleTypedData,
  encodePermit2Data,
  PERMIT2_ADDRESS,
  type PermitSingle,
  permitDeadlines,
  readPermit2Allowance,
} from "./permit2";

/** Funding path for a deposit-side write. `permit2` (default) signs a fresh
 *  `PermitSingle`; `native` approves the vault to `transferFrom`. */
export type Strategy = "permit2" | "native";

export interface FlowContext {
  walletClient: EngineWalletClient;
  publicClient: EnginePublicClient;
  chainId?: number;
}

export interface DepositArgs {
  vault: Address;
  amount: bigint;
  receiver?: Address;
  strategy?: Strategy;
  /**
   * ERC-20 approval size. Defaults to `"max"`: an unlimited approval
   * (`maxUint256`) to Permit2, or to the vault when `strategy` is `"native"`.
   */
  approveAmount?: "max" | bigint;
}
export interface RequestDepositArgs {
  vault: Address;
  amount: bigint;
  controller?: Address;
  strategy?: Strategy;
  /**
   * ERC-20 approval size. Defaults to `"max"`: an unlimited approval
   * (`maxUint256`) to Permit2, or to the vault when `strategy` is `"native"`.
   */
  approveAmount?: "max" | bigint;
}
export interface RedeemArgs {
  vault: Address;
  shares: bigint;
  receiver?: Address;
  owner?: Address;
}
export interface RequestRedeemArgs {
  vault: Address;
  shares: bigint;
  controller?: Address;
  owner?: Address;
}
export interface DecreaseDepositArgs {
  vault: Address;
  amount: bigint;
  receiver?: Address;
  /**
   * Minimum assets the vault must return. Defaults to `0n` (zero slippage):
   * there is no floor, so a price move before inclusion can return dust.
   */
  minAmountOut?: bigint;
}
export interface DecreaseRedeemArgs {
  vault: Address;
  shares: bigint;
  owner?: Address;
  receiver?: Address;
}
export interface ClaimDepositArgs {
  vault: Address;
  receiver?: Address;
}
export interface ClaimRedeemArgs {
  vault: Address;
  receiver?: Address;
  owner?: Address;
}

async function resolveChainId(ctx: FlowContext): Promise<number> {
  return ctx.chainId ?? (await ctx.walletClient.getChainId());
}

/** The vault's underlying ERC20 — the funding token for approve / permit2. */
export async function resolveAsset(
  publicClient: EnginePublicClient,
  vault: Address,
): Promise<Address> {
  const [asset] = await readCall<[Address]>(earn.underlying, publicClient, {
    address: vault,
    args: [],
  });
  return asset;
}

interface Funding {
  steps: Step[];
  /** Resolve the `permit2Data` arg for the terminal tx: the encoded signed
   *  `PermitSingle` (permit2) or `"0x"` (native). */
  payload: (ctx: StepCtx) => Promise<Hex>;
}

function makeFunding(p: {
  strategy: Strategy;
  asset: Address;
  amount: bigint;
  vault: Address;
  account: Address;
  chainId: number;
  approveAmount?: "max" | bigint;
}): Funding {
  // `"max"` is what the engine sends as `maxUint256` — an unlimited approval.
  const approveAmount = p.approveAmount ?? "max";
  if (p.strategy === "native") {
    return {
      steps: [
        {
          kind: "requireAllowance",
          token: p.asset,
          owner: p.account,
          spender: p.vault,
          amount: p.amount,
          approveAmount,
        },
      ],
      payload: async () => "0x",
    };
  }

  const signId = "permit2";
  let permit: PermitSingle | undefined;
  const steps: Step[] = [
    {
      kind: "requireAllowance",
      token: p.asset,
      owner: p.account,
      spender: PERMIT2_ADDRESS,
      amount: p.amount,
      approveAmount,
    },
    {
      kind: "signTypedData",
      id: signId,
      build: async (ctx) => {
        const { nonce } = await readPermit2Allowance(ctx.publicClient, {
          owner: p.account,
          token: p.asset,
          spender: p.vault,
        });
        const { expiration, sigDeadline } = permitDeadlines(Number(await ctx.chainTimestamp()));
        permit = {
          details: { token: p.asset, amount: p.amount, expiration, nonce },
          spender: p.vault,
          sigDeadline,
        };
        const typed = buildPermitSingleTypedData(permit, p.chainId);
        return { chainId: p.chainId, ...typed, types: typed.types as TypedData };
      },
    },
  ];

  return {
    steps,
    payload: async (ctx) => {
      const sig = ctx.signature(signId);
      if (sig === undefined || permit === undefined) {
        throw new PlatformActionError({ message: "missing permit2 signature" });
      }
      return encodePermit2Data(permit, sig);
    },
  };
}

/**
 * Sync deposit. The funding step asks for an unlimited approval (`maxUint256`)
 * to Permit2, or to the vault when `strategy` is `"native"`, unless
 * `approveAmount` is set. This call has no slippage floor. Cancelling a
 * pending deposit (`decreaseDepositSteps`) defaults to zero slippage
 * (`minAmountOut` of `0n`).
 */
export async function depositSteps(ctx: FlowContext, args: DepositArgs): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  const receiver = args.receiver ?? account;
  const asset = await resolveAsset(ctx.publicClient, args.vault);
  const funding = makeFunding({
    strategy: args.strategy ?? "permit2",
    asset,
    amount: args.amount,
    vault: args.vault,
    account,
    chainId,
    approveAmount: args.approveAmount,
  });
  return [
    { kind: "requireChain", chainId },
    ...funding.steps,
    {
      kind: "tx",
      to: args.vault,
      data: async (c) =>
        encodeCall(earn.depositWithPayload, [receiver, args.amount, await funding.payload(c)]),
    },
  ];
}

/**
 * Async deposit request. Same unlimited approval as `depositSteps`:
 * `maxUint256` to Permit2, or to the vault when `strategy` is `"native"`,
 * unless `approveAmount` is set.
 */
export async function requestDepositSteps(
  ctx: FlowContext,
  args: RequestDepositArgs,
): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  // Funds are pulled from the signer; `controller` receives the claimable shares.
  const receiver = args.controller ?? account;
  const asset = await resolveAsset(ctx.publicClient, args.vault);
  const funding = makeFunding({
    strategy: args.strategy ?? "permit2",
    asset,
    amount: args.amount,
    vault: args.vault,
    account,
    chainId,
    approveAmount: args.approveAmount,
  });
  return [
    { kind: "requireChain", chainId },
    ...funding.steps,
    {
      kind: "tx",
      to: args.vault,
      data: async (c) =>
        encodeCall(earn.requestDeposit, [receiver, false, args.amount, await funding.payload(c)]),
    },
  ];
}

/** Redeem / requestRedeem both burn from `balanceOf` and do NOT auto-claim
 *  settled deposit shares, so an owner holding claimable-but-unclaimed shares
 *  would revert. Fold `claimDeposit(owner)` + the burn into one Solady
 *  multicall (one signature, one atomic tx, msg.sender preserved) when
 *  claimable > 0; else the plain single call. */
async function burnFlow(
  ctx: FlowContext,
  vault: Address,
  owner: Address,
  finalCall: Hex,
): Promise<Step[]> {
  const chainId = await resolveChainId(ctx);
  const [claimable] = await readCall<[bigint]>(earn.previewClaimDeposit, ctx.publicClient, {
    address: vault,
    args: [owner],
  });
  const data =
    claimable > 0n
      ? encodeCall(earn.batch, [[encodeCall(earn.claimDeposit, [owner]), finalCall]])
      : finalCall;
  return [
    { kind: "requireChain", chainId },
    { kind: "tx", to: vault, data },
  ];
}

export async function redeemSteps(ctx: FlowContext, args: RedeemArgs): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const owner = args.owner ?? account;
  const receiver = args.receiver ?? account;
  const redeemCall = encodeCall(earn.redeem, [args.shares, receiver, owner]);
  return burnFlow(ctx, args.vault, owner, redeemCall);
}

export async function requestRedeemSteps(
  ctx: FlowContext,
  args: RequestRedeemArgs,
): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const owner = args.owner ?? account;
  const receiver = args.controller ?? account;
  const requestCall = encodeCall(earn.requestRedeem, [receiver, owner, owner, false, args.shares]);
  return burnFlow(ctx, args.vault, owner, requestCall);
}

/**
 * Cancel pending deposit assets. `minAmountOut` defaults to `0n` — zero
 * slippage — so the call does not enforce a floor on assets returned.
 */
export async function decreaseDepositSteps(
  ctx: FlowContext,
  args: DecreaseDepositArgs,
): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  const receiver = args.receiver ?? account;
  const minAmountOut = args.minAmountOut ?? 0n;
  return [
    { kind: "requireChain", chainId },
    {
      kind: "tx",
      to: args.vault,
      data: encodeCall(earn.decreaseDepositRequest, [receiver, false, args.amount, minAmountOut]),
    },
  ];
}

export async function decreaseRedeemSteps(
  ctx: FlowContext,
  args: DecreaseRedeemArgs,
): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  const owner = args.owner ?? account;
  const receiver = args.receiver ?? account;
  return [
    { kind: "requireChain", chainId },
    {
      kind: "tx",
      to: args.vault,
      data: encodeCall(earn.decreaseRedeemRequest, [owner, receiver, args.shares]),
    },
  ];
}

export async function claimDepositSteps(ctx: FlowContext, args: ClaimDepositArgs): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  const receiver = args.receiver ?? account;
  return [
    { kind: "requireChain", chainId },
    { kind: "tx", to: args.vault, data: encodeCall(earn.claimDeposit, [receiver]) },
  ];
}

export async function claimRedeemSteps(ctx: FlowContext, args: ClaimRedeemArgs): Promise<Step[]> {
  const account = requireAccount(ctx.walletClient);
  const chainId = await resolveChainId(ctx);
  const owner = args.owner ?? account;
  const receiver = args.receiver ?? account;
  return [
    { kind: "requireChain", chainId },
    {
      kind: "tx",
      to: args.vault,
      data: encodeCall(earn.claimRedeem, [owner, receiver, false]),
    },
  ];
}
