import type { Address, Hex } from "viem";
import { type OnchainClients } from "../transport/engine.js";
import { type DeployVaultArgs } from "./deployment.js";
interface Target {
    vault: Address;
    chainId: number;
}
export interface DepositInput extends Target {
    amount: bigint;
    receiver?: Address;
    permit2Data?: Hex;
}
export interface RequestDepositInput extends Target {
    amount: bigint;
    controller?: Address;
    permit2Data?: Hex;
}
export interface RedeemInput extends Target {
    shares: bigint;
    receiver?: Address;
    owner?: Address;
}
export interface RequestRedeemInput extends Target {
    shares: bigint;
    controller?: Address;
    owner?: Address;
}
export interface DecreaseDepositInput extends Target {
    amount: bigint;
    receiver?: Address;
    minAmountOut: bigint;
}
export interface DecreaseRedeemInput extends Target {
    shares: bigint;
    owner?: Address;
    receiver?: Address;
}
export interface ClaimDepositInput extends Target {
    receiver?: Address;
}
export interface ClaimRedeemInput extends Target {
    receiver?: Address;
    owner?: Address;
}
/** Explicit contract actions. Funding, approvals, permits and claim-before-redeem are the caller's responsibility. */
export declare function makeDepositorActions(clients: OnchainClients): {
    read: import("../transport/bindings.js").Reads<{
        previewAddress: (i: {
            factory: Address;
            deployer: Address;
            salt: Hex;
        }) => Promise<`0x${string}`>;
        asset: (i: {
            vault: Address;
        }) => Promise<`0x${string}`>;
        totalSupply: (i: {
            vault: Address;
        }) => Promise<bigint>;
        maxDeposit: (i: {
            vault: Address;
            receiver: Address;
        }) => Promise<bigint>;
        maxRedeem: (i: {
            vault: Address;
            owner: Address;
        }) => Promise<bigint>;
        previewDeposit: (i: {
            vault: Address;
            amount: bigint;
        }) => Promise<bigint>;
        previewRedeem: (i: {
            vault: Address;
            shares: bigint;
        }) => Promise<bigint>;
        previewClaimDeposit: (i: {
            vault: Address;
            owner: Address;
        }) => Promise<bigint>;
    }>;
    create: (input: DeployVaultArgs) => Promise<import("../index.js").TransactionResult>;
    deposit: (input: DepositInput) => Promise<import("../index.js").TransactionResult>;
    requestDeposit: (input: RequestDepositInput) => Promise<import("../index.js").TransactionResult>;
    redeem: (input: RedeemInput) => Promise<import("../index.js").TransactionResult>;
    requestRedeem: (input: RequestRedeemInput) => Promise<import("../index.js").TransactionResult>;
    decreaseDepositRequest: (input: DecreaseDepositInput) => Promise<import("../index.js").TransactionResult>;
    decreaseRedeemRequest: (input: DecreaseRedeemInput) => Promise<import("../index.js").TransactionResult>;
    claimDeposit: (input: ClaimDepositInput) => Promise<import("../index.js").TransactionResult>;
    claimRedeem: (input: ClaimRedeemInput) => Promise<import("../index.js").TransactionResult>;
};
export {};
