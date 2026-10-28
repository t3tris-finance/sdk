import type { Address, Hex } from "viem";
import { type OnchainClients } from "./engine.js";
import { type DeployVaultArgs } from "./factory.js";
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
    read: import("../curate/shared.js").Reads<{
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
    create: (input: DeployVaultArgs) => Promise<import("./engine.js").TransactionResult>;
    deposit: (input: DepositInput) => Promise<import("./engine.js").TransactionResult>;
    requestDeposit: (input: RequestDepositInput) => Promise<import("./engine.js").TransactionResult>;
    redeem: (input: RedeemInput) => Promise<import("./engine.js").TransactionResult>;
    requestRedeem: (input: RequestRedeemInput) => Promise<import("./engine.js").TransactionResult>;
    decreaseDepositRequest: (input: DecreaseDepositInput) => Promise<import("./engine.js").TransactionResult>;
    decreaseRedeemRequest: (input: DecreaseRedeemInput) => Promise<import("./engine.js").TransactionResult>;
    claimDeposit: (input: ClaimDepositInput) => Promise<import("./engine.js").TransactionResult>;
    claimRedeem: (input: ClaimRedeemInput) => Promise<import("./engine.js").TransactionResult>;
};
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
    }) => Promise<import("./engine.js").TransactionResult>;
};
export {};
