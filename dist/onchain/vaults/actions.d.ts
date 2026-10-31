import type { Address, Hex } from "viem";
import { type OnchainClients } from "../transport/engine.js";
import { type DeployVaultArgs } from "./deployment.js";
interface Target {
    address: Address;
    chainId: number;
}
export interface RequestDepositInput extends Target {
    amount: bigint;
    controller?: Address;
    permit2Data?: Hex;
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
            address: Address;
        }) => Promise<`0x${string}`>;
        totalSupply: (i: {
            address: Address;
        }) => Promise<bigint>;
        previewClaimDeposit: (i: {
            address: Address;
            owner: Address;
        }) => Promise<bigint>;
    }>;
    create: (input: DeployVaultArgs) => Promise<import("../index.js").TransactionResult>;
    requestDeposit: (input: RequestDepositInput) => Promise<import("../index.js").TransactionResult>;
    requestRedeem: (input: RequestRedeemInput) => Promise<import("../index.js").TransactionResult>;
    decreaseDepositRequest: (input: DecreaseDepositInput) => Promise<import("../index.js").TransactionResult>;
    decreaseRedeemRequest: (input: DecreaseRedeemInput) => Promise<import("../index.js").TransactionResult>;
    claimDeposit: (input: ClaimDepositInput) => Promise<import("../index.js").TransactionResult>;
    claimRedeem: (input: ClaimRedeemInput) => Promise<import("../index.js").TransactionResult>;
};
export {};
