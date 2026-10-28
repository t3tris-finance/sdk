/**
 * The curate (vault-admin) call tables — selectors + positional ABI params, as
 * deployed. Hand-ported from the frozen `@t3tris/core` generated tables the
 * same way `wallet/calls.ts` ports the earn surface: no ABI is shipped, every
 * op is a 4-byte selector plus `encodeAbiParameters` over the `in` list.
 *
 * Write entries carry `out: []` — a write's return value is never decoded, and
 * several vault writes return a large settlement struct. Read that struct from
 * indexed state or the matching `preview*` read instead. Read entries carry
 * the real `out` (including tuple `components`) so `readCall` can decode them.
 */
import type { AbiParam } from "../wallet/calls.js";
export declare const curateVault: {
    readonly settleDeposits: {
        readonly sel: "0x69872acd";
        readonly in: readonly [{
            readonly type: "uint8";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly settleRedemptions: {
        readonly sel: "0x677a273f";
        readonly in: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly settleAll: {
        readonly sel: "0x3b1d828d";
        readonly in: readonly [{
            readonly type: "uint8";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly setNextManagementFee: {
        readonly sel: "0xb2e97573";
        readonly in: readonly [{
            readonly type: "uint64";
        }, {
            readonly type: "uint32";
        }];
        readonly out: readonly [];
    };
    readonly setNextPerformanceFee: {
        readonly sel: "0xb1fdb7cb";
        readonly in: readonly [{
            readonly type: "uint64";
        }];
        readonly out: readonly [];
    };
    readonly setNextEntryFee: {
        readonly sel: "0x5adce65d";
        readonly in: readonly [{
            readonly type: "uint64";
        }];
        readonly out: readonly [];
    };
    readonly setNextExitFee: {
        readonly sel: "0x757e26aa";
        readonly in: readonly [{
            readonly type: "uint64";
        }];
        readonly out: readonly [];
    };
    readonly claimFees: {
        readonly sel: "0x43641268";
        readonly in: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }, {
            readonly type: "uint256";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly updateSharesBatched: {
        readonly sel: "0xb6fc343e";
        readonly in: readonly [{
            readonly type: "address[]";
        }, {
            readonly type: "uint256[]";
        }];
        readonly out: readonly [];
    };
    readonly updateAccruedFees: {
        readonly sel: "0x1950882c";
        readonly in: readonly [];
        readonly out: readonly [];
    };
    readonly setDepositEnabled: {
        readonly sel: "0x5b17d04b";
        readonly in: readonly [{
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setTransferEnabled: {
        readonly sel: "0x9fe9f623";
        readonly in: readonly [{
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly openFund: {
        readonly sel: "0xd1408e60";
        readonly in: readonly [{
            readonly type: "uint8";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly closeFund: {
        readonly sel: "0x876f2559";
        readonly in: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [];
    };
    readonly enableEndOfFund: {
        readonly sel: "0xcf6e54d0";
        readonly in: readonly [{
            readonly type: "uint8";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly disableEndOfFund: {
        readonly sel: "0x0b0b4083";
        readonly in: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [];
    };
    readonly setDepositWhitelistEnabled: {
        readonly sel: "0xeb2f8f77";
        readonly in: readonly [{
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setWithdrawWhitelistEnabled: {
        readonly sel: "0x42b2233e";
        readonly in: readonly [{
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setDepositWhitelisted: {
        readonly sel: "0x5379071c";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setWithdrawWhitelisted: {
        readonly sel: "0x6ed36792";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setShareNameAndSymbol: {
        readonly sel: "0x08a4b90c";
        readonly in: readonly [{
            readonly type: "string";
        }, {
            readonly type: "string";
        }];
        readonly out: readonly [];
    };
    readonly setMetadataHash: {
        readonly sel: "0x4e3b62ec";
        readonly in: readonly [{
            readonly type: "string";
        }];
        readonly out: readonly [];
    };
    readonly setCurator: {
        readonly sel: "0xe90956cf";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly setFeeRecipient: {
        readonly sel: "0xe74b981b";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly setOracle: {
        readonly sel: "0x7adbf973";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly setTreasury: {
        readonly sel: "0x059fcb54";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly setSyncSilo: {
        readonly sel: "0xf9c3a763";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setDepositSilo: {
        readonly sel: "0x6738f68c";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly setRedeemSilo: {
        readonly sel: "0x0115e116";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [];
    };
    readonly claimSilosPnl: {
        readonly sel: "0xfebc5a91";
        readonly in: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [];
    };
    readonly sweep: {
        readonly sel: "0x01681a62";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly nextEntryFee: {
        readonly sel: "0x86f74e08";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "uint64";
        }];
    };
    readonly balanceOf: {
        readonly sel: "0x70a08231";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly nextExitFee: {
        readonly sel: "0x241d0c4d";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "uint64";
        }];
    };
    readonly nextPerformanceFee: {
        readonly sel: "0xcb1f31a8";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "bool";
        }, {
            readonly type: "uint64";
        }];
    };
    readonly nextManagementFee: {
        readonly sel: "0x54c64141";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "tuple";
            readonly components: readonly [{
                readonly type: "bool";
            }, {
                readonly type: "bool";
            }, {
                readonly type: "uint64";
            }, {
                readonly type: "uint32";
            }];
        }];
    };
    readonly previewCloseFund: {
        readonly sel: "0xb22ac7c1";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly previewClaimFees: {
        readonly sel: "0xdc4958cb";
        readonly in: readonly [{
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly curator: {
        readonly sel: "0x0e5bffcc";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
    readonly vaultOpen: {
        readonly sel: "0xec36d35e";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "bool";
        }];
    };
    readonly previewSettleAll: {
        readonly sel: "0x1b0755c3";
        readonly in: readonly [{
            readonly type: "uint8";
        }];
        readonly out: readonly [AbiParam];
    };
    readonly previewSettleDeposits: {
        readonly sel: "0x004dc36a";
        readonly in: readonly [{
            readonly type: "uint8";
        }];
        readonly out: readonly [AbiParam];
    };
    readonly previewSettleRedemptions: {
        readonly sel: "0x792314d5";
        readonly in: readonly [{
            readonly type: "bool";
        }];
        readonly out: readonly [AbiParam];
    };
    readonly previewOpenFund: {
        readonly sel: "0xf0e0659f";
        readonly in: readonly [{
            readonly type: "uint8";
        }];
        readonly out: readonly [AbiParam];
    };
    readonly previewEnableEndOfFund: {
        readonly sel: "0x8bfb28af";
        readonly in: readonly [{
            readonly type: "uint8";
        }];
        readonly out: readonly [AbiParam];
    };
};
export declare const curateRoles: {
    readonly grant: {
        readonly sel: "0x2f2ff15d";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly revoke: {
        readonly sel: "0xd547741f";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly renounce: {
        readonly sel: "0x36568abe";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly initGrantAdmin: {
        readonly sel: "0xd341111b";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bytes32";
        }];
        readonly out: readonly [];
    };
    readonly acceptAdmin: {
        readonly sel: "0xc0972181";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [];
    };
    readonly cancelGrantAdmin: {
        readonly sel: "0xa38abedf";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [];
    };
    readonly applyAdminBurn: {
        readonly sel: "0xc51686e8";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [];
    };
    readonly has: {
        readonly sel: "0x91d14854";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "bool";
        }];
    };
    readonly adminOf: {
        readonly sel: "0x248a9ca3";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [{
            readonly type: "bytes32";
        }];
    };
    readonly memberCount: {
        readonly sel: "0xca15c873";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly members: {
        readonly sel: "0xa3246ad3";
        readonly in: readonly [{
            readonly type: "bytes32";
        }];
        readonly out: readonly [{
            readonly type: "address[]";
        }];
    };
    readonly defaultAdminRole: {
        readonly sel: "0xa217fddf";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "bytes32";
        }];
    };
    readonly nextDefaultAdminRecipient: {
        readonly sel: "0x1a758a2f";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
    readonly nextGovernanceAdminRecipient: {
        readonly sel: "0x7f031d5f";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
};
export declare const curateOracle: {
    readonly setTotalAssets: {
        readonly sel: "0x1765b313";
        readonly in: readonly [{
            readonly type: "uint256";
        }];
        readonly out: readonly [];
    };
    readonly setMaxDeviationUp: {
        readonly sel: "0x6a8b6beb";
        readonly in: readonly [{
            readonly type: "uint128";
        }];
        readonly out: readonly [];
    };
    readonly setMaxDeviationDown: {
        readonly sel: "0x5d1ffe58";
        readonly in: readonly [{
            readonly type: "uint64";
        }];
        readonly out: readonly [];
    };
    readonly beginAdminTransfer: {
        readonly sel: "0x634e93da";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly acceptAdminTransfer: {
        readonly sel: "0xcefc1429";
        readonly in: readonly [];
        readonly out: readonly [];
    };
    readonly cancelAdminTransfer: {
        readonly sel: "0xd602b9fd";
        readonly in: readonly [];
        readonly out: readonly [];
    };
    readonly changeAdminDelay: {
        readonly sel: "0x649a5ec7";
        readonly in: readonly [{
            readonly type: "uint48";
        }];
        readonly out: readonly [];
    };
    readonly rollbackAdminDelay: {
        readonly sel: "0x0aa6220b";
        readonly in: readonly [];
        readonly out: readonly [];
    };
    readonly grant: {
        readonly sel: "0x2f2ff15d";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly revoke: {
        readonly sel: "0xd547741f";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly renounce: {
        readonly sel: "0x36568abe";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [];
    };
    readonly totalAssets: {
        readonly sel: "0x01e1d114";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly maxDeviationUp: {
        readonly sel: "0x84e14eb0";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint128";
        }];
    };
    readonly maxDeviationDown: {
        readonly sel: "0x20d2ed01";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint64";
        }];
    };
    readonly lastSavedPps: {
        readonly sel: "0x2d1a2da7";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint128";
        }];
    };
    readonly admin: {
        readonly sel: "0x84ef8ffc";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
    readonly defaultAdminDelay: {
        readonly sel: "0xcc8463c8";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint48";
        }];
    };
    readonly pendingAdmin: {
        readonly sel: "0xcf6eefb7";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }, {
            readonly type: "uint48";
        }];
    };
    readonly owner: {
        readonly sel: "0x8da5cb5b";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
    readonly has: {
        readonly sel: "0x91d14854";
        readonly in: readonly [{
            readonly type: "bytes32";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "bool";
        }];
    };
};
export declare const curateSilo: {
    readonly pause: {
        readonly sel: "0x8456cb59";
        readonly in: readonly [];
        readonly out: readonly [];
    };
    readonly unpause: {
        readonly sel: "0x3f4ba83a";
        readonly in: readonly [];
        readonly out: readonly [];
    };
};
