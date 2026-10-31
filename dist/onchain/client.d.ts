import { type Address, type EIP1193Provider } from "viem";
import type { PublicClientSource, WalletClientSource } from "./transport/engine.js";
export type WalletOptions = {
    walletClient: WalletClientSource;
    publicClient: PublicClientSource;
    provider?: never;
    account?: never;
} | {
    provider: EIP1193Provider;
    account: Address;
    walletClient?: never;
    publicClient?: never;
};
export declare function createOnchainClient(options: WalletOptions): {
    vaults: {
        read: {
            previewAddress: (input: {
                factory: Address;
                deployer: Address;
                salt: import("viem").Hex;
            } & {
                chainId: number;
            }) => Promise<`0x${string}`>;
            asset: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<`0x${string}`>;
            totalSupply: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<bigint>;
            previewClaimDeposit: (input: {
                address: Address;
                owner: Address;
            } & {
                chainId: number;
            }) => Promise<bigint>;
            curator: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<`0x${string}`>;
            isOpen: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<boolean>;
            previewSettleAll: (input: {
                address: Address;
                feeClaimType?: import("../index.js").FeeClaimType;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").SettlePreview>;
            previewSettleDeposits: (input: {
                address: Address;
                feeClaimType?: import("../index.js").FeeClaimType;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").SettleDepositsPreview>;
            previewSettleRedemptions: (input: {
                address: Address;
                fullClaim?: boolean;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").SettleRedemptionsPreview>;
            previewEnableEndOfFund: (input: {
                address: Address;
                feeClaimType?: import("../index.js").FeeClaimType;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").OpenPreview>;
            previewCloseFund: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<bigint>;
            previewClaimFees: (input: {
                address: Address;
                shares: bigint;
            } & {
                chainId: number;
            }) => Promise<bigint>;
            balanceOf: (input: {
                address: Address;
                owner: Address;
            } & {
                chainId: number;
            }) => Promise<bigint>;
            nextEntryFee: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").QueuedFee>;
            nextExitFee: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").QueuedFee>;
            nextPerformanceFee: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").QueuedFee>;
            nextManagementFee: (input: {
                address: Address;
            } & {
                chainId: number;
            }) => Promise<import("../index.js").QueuedManagementFee>;
        };
        create: (input: import("../index.js").DeployVaultArgs) => Promise<import("../index.js").TransactionResult>;
        requestDeposit: (input: import("./vaults/actions.js").RequestDepositInput) => Promise<import("../index.js").TransactionResult>;
        requestRedeem: (input: import("./vaults/actions.js").RequestRedeemInput) => Promise<import("../index.js").TransactionResult>;
        decreaseDepositRequest: (input: import("./vaults/actions.js").DecreaseDepositInput) => Promise<import("../index.js").TransactionResult>;
        decreaseRedeemRequest: (input: import("./vaults/actions.js").DecreaseRedeemInput) => Promise<import("../index.js").TransactionResult>;
        claimDeposit: (input: import("./vaults/actions.js").ClaimDepositInput) => Promise<import("../index.js").TransactionResult>;
        claimRedeem: (input: import("./vaults/actions.js").ClaimRedeemInput) => Promise<import("../index.js").TransactionResult>;
        settle: (input: import("../index.js").SettleInput) => Promise<import("../index.js").TransactionResult>;
        setNextManagementFee: (input: import("./vaults/admin.js").Target & {
            wad: bigint;
            days: number;
        }) => Promise<import("../index.js").TransactionResult>;
        setNextPerformanceFee: (input: import("./vaults/admin.js").Target & {
            wad: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        setNextEntryFee: (input: import("./vaults/admin.js").Target & {
            wad: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        setNextExitFee: (input: import("./vaults/admin.js").Target & {
            wad: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        claimFees: (input: import("./vaults/admin.js").Target & {
            shares: bigint;
            unsafe?: boolean;
            minAssetsOut?: bigint;
            permit2Data?: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
        updateAccruedFees: (input: import("./vaults/admin.js").Target) => Promise<import("../index.js").TransactionResult>;
        updateSharesBatched: (input: import("./vaults/admin.js").Target & {
            receivers: readonly Address[];
            values: readonly bigint[];
        }) => Promise<import("../index.js").TransactionResult>;
        setDepositEnabled: (input: import("./vaults/admin.js").Target & {
            enabled: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        setTransferEnabled: (input: import("./vaults/admin.js").Target & {
            enabled: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        pause: (input: import("./vaults/admin.js").Target) => Promise<import("../index.js").TransactionResult>;
        unpause: (input: import("./vaults/admin.js").Target) => Promise<import("../index.js").TransactionResult>;
        close: (input: import("./vaults/admin.js").Target & {
            unsafe?: boolean;
            minAssetsOut?: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        enableEndOfFund: (input: import("./vaults/admin.js").Target & {
            feeClaimType?: import("../index.js").FeeClaimType;
            unsafe?: boolean;
            permit2Data?: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
        disableEndOfFund: (input: import("./vaults/admin.js").Target & {
            unsafe?: boolean;
            closeVault?: boolean;
            minAssetsOut?: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        setDepositWhitelistEnabled: (input: import("./vaults/admin.js").Target & {
            enabled: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        setWithdrawWhitelistEnabled: (input: import("./vaults/admin.js").Target & {
            enabled: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        applyDepositWhitelist: (input: import("./vaults/admin.js").WhitelistBatchInput) => Promise<import("../index.js").TransactionResult>;
        applyWithdrawWhitelist: (input: import("./vaults/admin.js").WhitelistBatchInput) => Promise<import("../index.js").TransactionResult>;
        setShareNameAndSymbol: (input: import("./vaults/admin.js").Target & {
            name: string;
            symbol: string;
        }) => Promise<import("../index.js").TransactionResult>;
        setIpfsHash: (input: import("./vaults/admin.js").Target & {
            hash: string;
        }) => Promise<import("../index.js").TransactionResult>;
        setCurator: (input: import("./vaults/admin.js").Target & {
            curator: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        setFeeRecipient: (input: import("./vaults/admin.js").Target & {
            feeRecipient: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        setOracle: (input: import("./vaults/admin.js").Target & {
            oracle: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        setT3treasury: (input: import("./vaults/admin.js").Target & {
            treasury: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        setSyncSilo: (input: import("./vaults/admin.js").Target & {
            silo: Address;
            unsafeOut?: boolean;
            unsafeIn?: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        setDepositSilo: (input: import("./vaults/admin.js").Target & {
            silo: Address;
            unsafeOut?: boolean;
            unsafeIn?: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        setRedeemSilo: (input: import("./vaults/admin.js").Target & {
            silo: Address;
            unsafeOut?: boolean;
            unsafeIn?: boolean;
        }) => Promise<import("../index.js").TransactionResult>;
        claimSilosPnl: (input: import("./vaults/admin.js").Target & {
            sync?: boolean;
            deposit?: boolean;
            unsafe?: boolean;
            redeemRequestId?: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        sweep: (input: import("./vaults/admin.js").Target & {
            token: Address;
        }) => Promise<import("../index.js").TransactionResult>;
    };
    roles: {
        read: import("./transport/bindings.js").Reads<{
            has: (i: {
                address: Address;
                role: import("viem").Hex;
                account: Address;
            }) => Promise<boolean>;
            adminOf: (i: {
                address: Address;
                role: import("viem").Hex;
            }) => Promise<`0x${string}`>;
            memberCount: (i: {
                address: Address;
                role: import("viem").Hex;
            }) => Promise<bigint>;
            members: (i: {
                address: Address;
                role: import("viem").Hex;
            }) => Promise<readonly `0x${string}`[]>;
            defaultAdminRole: (i: {
                address: Address;
            }) => Promise<`0x${string}`>;
            nextDefaultAdminRecipient: (i: {
                address: Address;
            }) => Promise<`0x${string}`>;
            nextGovernanceAdminRecipient: (i: {
                address: Address;
            }) => Promise<`0x${string}`>;
        }>;
        grant: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        revoke: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        renounceRole: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        grantAll: (input: import("./roles/index.js").Target & {
            account: Address;
            roles: readonly import("viem").Hex[];
        }) => Promise<import("../index.js").TransactionResult>;
        grantBatch: (input: import("./roles/index.js").Target & {
            calls: readonly {
                role: import("viem").Hex;
                account: Address;
            }[];
        }) => Promise<import("../index.js").TransactionResult>;
        revokeBatch: (input: import("./roles/index.js").Target & {
            calls: readonly {
                role: import("viem").Hex;
                account: Address;
            }[];
        }) => Promise<import("../index.js").TransactionResult>;
        initGrantAdminRole: (input: import("./roles/index.js").Target & {
            account: Address;
            role: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
        acceptAdminRole: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
        cancelGrantAdminRole: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
        applyAdminBurn: (input: import("./roles/index.js").Target & {
            role: import("viem").Hex;
        }) => Promise<import("../index.js").TransactionResult>;
    };
    oracles: {
        read: import("./transport/bindings.js").Reads<{
            totalAssets: (i: {
                oracle: Address;
            }) => Promise<bigint>;
            maxDeviationUp: (i: {
                oracle: Address;
            }) => Promise<bigint>;
            maxDeviationDown: (i: {
                oracle: Address;
            }) => Promise<bigint>;
            admin: (i: {
                oracle: Address;
            }) => Promise<`0x${string}`>;
            defaultAdminDelay: (i: {
                oracle: Address;
            }) => Promise<bigint>;
            pendingAdmin: (i: {
                oracle: Address;
            }) => Promise<{
                pending: `0x${string}`;
                delay: number;
            }>;
            owner: (i: {
                oracle: Address;
            }) => Promise<`0x${string}`>;
            has: (i: {
                oracle: Address;
                role: import("viem").Hex;
                account: Address;
            }) => Promise<boolean>;
            lastSavedPps: (i: {
                oracle: Address;
            }) => Promise<bigint>;
        }>;
        setTotalAssets: (input: import("./oracles/index.js").Target & {
            totalAssets: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        setMaxPricePerShareDeviationUpWad: (input: import("./oracles/index.js").Target & {
            wad: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        setMaxPricePerShareDeviationDownWad: (input: import("./oracles/index.js").Target & {
            wad: bigint;
        }) => Promise<import("../index.js").TransactionResult>;
        beginDefaultAdminTransfer: (input: import("./oracles/index.js").Target & {
            newAdmin: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        acceptDefaultAdminTransfer: (input: import("./oracles/index.js").Target) => Promise<import("../index.js").TransactionResult>;
        cancelDefaultAdminTransfer: (input: import("./oracles/index.js").Target) => Promise<import("../index.js").TransactionResult>;
        changeDefaultAdminDelay: (input: import("./oracles/index.js").Target & {
            newDelay: number;
        }) => Promise<import("../index.js").TransactionResult>;
        rollbackDefaultAdminDelay: (input: import("./oracles/index.js").Target) => Promise<import("../index.js").TransactionResult>;
        grant: (input: import("./oracles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        revoke: (input: import("./oracles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        renounce: (input: import("./oracles/index.js").Target & {
            role: import("viem").Hex;
            account: Address;
        }) => Promise<import("../index.js").TransactionResult>;
        applyRoles: (input: import("./oracles/index.js").Target & {
            calls: readonly {
                op: "grant" | "revoke";
                role: import("viem").Hex;
                account: Address;
            }[];
        }) => Promise<import("../index.js").TransactionResult>;
    };
    tokens: {
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
    permit2: import("./transport/bindings.js").Reads<{
        allowance: (input: {
            owner: Address;
            token: Address;
            spender: Address;
        }) => Promise<{
            amount: bigint;
            expiration: number;
            nonce: number;
        }>;
    }>;
};
export type T3trisWalletClient = ReturnType<typeof createOnchainClient>;
