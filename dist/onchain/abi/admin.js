/**
 * `IVaultTypes.LastPeriodData` — 8×uint256, uint128, bool (all static).
 *
 * Nested tuples carry their components so decodeAbiParameters can decode
 * settlement preview results in ABI order.
 */
const LAST_PERIOD_DATA = {
    type: "tuple",
    components: [
        { type: "uint256" }, // oldTotalNetAssets
        { type: "uint256" }, // oldTotalNetSupply
        { type: "uint256" }, // managementFeeAssets
        { type: "uint256" }, // managementFeeShares
        { type: "uint256" }, // performanceFeeAssets
        { type: "uint256" }, // performanceFeeShares
        { type: "uint256" }, // periodFeeShares
        { type: "uint256" }, // pnl
        { type: "uint128" }, // updatedPps
        { type: "bool" }, // isProfit
    ],
};
/** The 2×uint256 sub-structs (entry/exit fees, net flows, tvl, unclaimed fees). */
const UINT_PAIR = {
    type: "tuple",
    components: [{ type: "uint256" }, { type: "uint256" }],
};
const UINT = { type: "uint256" };
/** `SettleResult` / `OpenResult` tail: 8 sub-structs, 7×uint256, uint128. */
const SETTLE_RESULT = {
    type: "tuple",
    components: [
        LAST_PERIOD_DATA,
        UINT_PAIR, // entryFees
        UINT_PAIR, // exitFees
        UINT_PAIR, // netDepositFlowData
        UINT_PAIR, // netRedeemFlowData
        UINT_PAIR, // grossTvlData
        UINT_PAIR, // netTvlData
        UINT_PAIR, // unclaimedFeesData
        UINT, // sharesToBurn
        UINT, // sharesToMint
        UINT, // assetsToT3treasury
        UINT, // assetsToCurator
        UINT, // assetsToFeeRecipient
        UINT, // assetsFromCurator
        UINT, // actualDepositedAssets
        { type: "uint128" }, // ppsHighWaterMark
    ],
};
/** `SettleDeposits/RedemptionsResult` tail: 6 sub-structs, 7×uint256. */
const SETTLE_FLOW_RESULT = {
    type: "tuple",
    components: [
        LAST_PERIOD_DATA,
        UINT_PAIR,
        UINT_PAIR,
        UINT_PAIR,
        UINT_PAIR,
        UINT_PAIR,
        UINT,
        UINT,
        UINT,
        UINT,
        UINT,
        UINT,
        UINT,
    ],
};
export const curateVault = {
    settleDeposits: {
        sel: "0x69872acd",
        in: [{ type: "uint8" }, { type: "bool" }, { type: "bytes" }],
        out: [],
    },
    settleRedemptions: {
        sel: "0x677a273f",
        in: [{ type: "bool" }, { type: "bool" }, { type: "bytes" }],
        out: [],
    },
    settleAll: {
        sel: "0x3b1d828d",
        in: [{ type: "uint8" }, { type: "bool" }, { type: "bytes" }],
        out: [],
    },
    setNextManagementFee: {
        sel: "0xb2e97573",
        in: [{ type: "uint64" }, { type: "uint32" }],
        out: [],
    },
    setNextPerformanceFee: { sel: "0xb1fdb7cb", in: [{ type: "uint64" }], out: [] },
    setNextEntryFee: { sel: "0x5adce65d", in: [{ type: "uint64" }], out: [] },
    setNextExitFee: { sel: "0x757e26aa", in: [{ type: "uint64" }], out: [] },
    claimFees: {
        sel: "0x43641268",
        in: [{ type: "bool" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
        out: [],
    },
    updateSharesBatched: {
        sel: "0xb6fc343e",
        in: [{ type: "address[]" }, { type: "uint256[]" }],
        out: [],
    },
    updateAccruedFees: { sel: "0x1950882c", in: [], out: [] },
    setDepositEnabled: { sel: "0x5b17d04b", in: [{ type: "bool" }], out: [] },
    setTransferEnabled: { sel: "0x9fe9f623", in: [{ type: "bool" }], out: [] },
    openFund: {
        sel: "0xd1408e60",
        in: [{ type: "uint8" }, { type: "bool" }, { type: "bytes" }],
        out: [],
    },
    closeFund: { sel: "0x876f2559", in: [{ type: "bool" }, { type: "uint256" }], out: [] },
    enableEndOfFund: {
        sel: "0xcf6e54d0",
        in: [{ type: "uint8" }, { type: "bool" }, { type: "bytes" }],
        out: [],
    },
    disableEndOfFund: {
        sel: "0x0b0b4083",
        in: [{ type: "bool" }, { type: "bool" }, { type: "uint256" }],
        out: [],
    },
    setDepositWhitelistEnabled: { sel: "0xeb2f8f77", in: [{ type: "bool" }], out: [] },
    setWithdrawWhitelistEnabled: { sel: "0x42b2233e", in: [{ type: "bool" }], out: [] },
    setDepositWhitelisted: {
        sel: "0x5379071c",
        in: [{ type: "address" }, { type: "bool" }],
        out: [],
    },
    setWithdrawWhitelisted: {
        sel: "0x6ed36792",
        in: [{ type: "address" }, { type: "bool" }],
        out: [],
    },
    setShareNameAndSymbol: {
        sel: "0x08a4b90c",
        in: [{ type: "string" }, { type: "string" }],
        out: [],
    },
    setMetadataHash: { sel: "0x4e3b62ec", in: [{ type: "string" }], out: [] },
    setCurator: { sel: "0xe90956cf", in: [{ type: "address" }], out: [] },
    setFeeRecipient: { sel: "0xe74b981b", in: [{ type: "address" }], out: [] },
    setOracle: { sel: "0x7adbf973", in: [{ type: "address" }], out: [] },
    setTreasury: { sel: "0x059fcb54", in: [{ type: "address" }], out: [] },
    setSyncSilo: {
        sel: "0xf9c3a763",
        in: [{ type: "address" }, { type: "bool" }, { type: "bool" }],
        out: [],
    },
    setDepositSilo: {
        sel: "0x6738f68c",
        in: [{ type: "address" }, { type: "bool" }, { type: "bool" }],
        out: [],
    },
    setRedeemSilo: {
        sel: "0x0115e116",
        in: [{ type: "address" }, { type: "bool" }, { type: "bool" }],
        out: [],
    },
    claimSilosPnl: {
        sel: "0xfebc5a91",
        in: [{ type: "bool" }, { type: "bool" }, { type: "bool" }, { type: "uint256" }],
        out: [],
    },
    sweep: { sel: "0x01681a62", in: [{ type: "address" }], out: [] },
    nextEntryFee: { sel: "0x86f74e08", in: [], out: [{ type: "bool" }, { type: "uint64" }] },
    balanceOf: { sel: "0x70a08231", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    nextExitFee: { sel: "0x241d0c4d", in: [], out: [{ type: "bool" }, { type: "uint64" }] },
    nextPerformanceFee: { sel: "0xcb1f31a8", in: [], out: [{ type: "bool" }, { type: "uint64" }] },
    nextManagementFee: {
        sel: "0x54c64141",
        in: [],
        out: [
            {
                type: "tuple",
                components: [{ type: "bool" }, { type: "bool" }, { type: "uint64" }, { type: "uint32" }],
            },
        ],
    },
    previewCloseFund: { sel: "0xb22ac7c1", in: [], out: [{ type: "uint256" }] },
    previewClaimFees: { sel: "0xdc4958cb", in: [{ type: "uint256" }], out: [{ type: "uint256" }] },
    curator: { sel: "0x0e5bffcc", in: [], out: [{ type: "address" }] },
    vaultOpen: { sel: "0xec36d35e", in: [], out: [{ type: "bool" }] },
    previewSettleAll: {
        sel: "0x1b0755c3",
        in: [{ type: "uint8" }],
        out: [SETTLE_RESULT],
    },
    previewSettleDeposits: {
        sel: "0x004dc36a",
        in: [{ type: "uint8" }],
        out: [SETTLE_FLOW_RESULT],
    },
    previewSettleRedemptions: {
        sel: "0x792314d5",
        in: [{ type: "bool" }],
        out: [SETTLE_FLOW_RESULT],
    },
    previewOpenFund: {
        sel: "0xf0e0659f",
        in: [{ type: "uint8" }],
        out: [SETTLE_RESULT],
    },
    previewEnableEndOfFund: {
        sel: "0x8bfb28af",
        in: [{ type: "uint8" }],
        out: [SETTLE_RESULT],
    },
};
export const curateRoles = {
    grant: { sel: "0x2f2ff15d", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    revoke: { sel: "0xd547741f", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    renounce: { sel: "0x36568abe", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    initGrantAdmin: { sel: "0xd341111b", in: [{ type: "address" }, { type: "bytes32" }], out: [] },
    acceptAdmin: { sel: "0xc0972181", in: [{ type: "bytes32" }], out: [] },
    cancelGrantAdmin: { sel: "0xa38abedf", in: [{ type: "bytes32" }], out: [] },
    applyAdminBurn: { sel: "0xc51686e8", in: [{ type: "bytes32" }], out: [] },
    has: {
        sel: "0x91d14854",
        in: [{ type: "bytes32" }, { type: "address" }],
        out: [{ type: "bool" }],
    },
    adminOf: { sel: "0x248a9ca3", in: [{ type: "bytes32" }], out: [{ type: "bytes32" }] },
    memberCount: { sel: "0xca15c873", in: [{ type: "bytes32" }], out: [{ type: "uint256" }] },
    members: { sel: "0xa3246ad3", in: [{ type: "bytes32" }], out: [{ type: "address[]" }] },
    defaultAdminRole: { sel: "0xa217fddf", in: [], out: [{ type: "bytes32" }] },
    nextDefaultAdminRecipient: { sel: "0x1a758a2f", in: [], out: [{ type: "address" }] },
    nextGovernanceAdminRecipient: { sel: "0x7f031d5f", in: [], out: [{ type: "address" }] },
};
export const curateOracle = {
    setTotalAssets: { sel: "0x1765b313", in: [{ type: "uint256" }], out: [] },
    setMaxDeviationUp: { sel: "0x6a8b6beb", in: [{ type: "uint128" }], out: [] },
    setMaxDeviationDown: { sel: "0x5d1ffe58", in: [{ type: "uint64" }], out: [] },
    beginAdminTransfer: { sel: "0x634e93da", in: [{ type: "address" }], out: [] },
    acceptAdminTransfer: { sel: "0xcefc1429", in: [], out: [] },
    cancelAdminTransfer: { sel: "0xd602b9fd", in: [], out: [] },
    changeAdminDelay: { sel: "0x649a5ec7", in: [{ type: "uint48" }], out: [] },
    rollbackAdminDelay: { sel: "0x0aa6220b", in: [], out: [] },
    grant: { sel: "0x2f2ff15d", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    revoke: { sel: "0xd547741f", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    renounce: { sel: "0x36568abe", in: [{ type: "bytes32" }, { type: "address" }], out: [] },
    totalAssets: { sel: "0x01e1d114", in: [], out: [{ type: "uint256" }] },
    maxDeviationUp: { sel: "0x84e14eb0", in: [], out: [{ type: "uint128" }] },
    maxDeviationDown: { sel: "0x20d2ed01", in: [], out: [{ type: "uint64" }] },
    lastSavedPps: { sel: "0x2d1a2da7", in: [], out: [{ type: "uint128" }] },
    admin: { sel: "0x84ef8ffc", in: [], out: [{ type: "address" }] },
    defaultAdminDelay: { sel: "0xcc8463c8", in: [], out: [{ type: "uint48" }] },
    pendingAdmin: { sel: "0xcf6eefb7", in: [], out: [{ type: "address" }, { type: "uint48" }] },
    owner: { sel: "0x8da5cb5b", in: [], out: [{ type: "address" }] },
    has: {
        sel: "0x91d14854",
        in: [{ type: "bytes32" }, { type: "address" }],
        out: [{ type: "bool" }],
    },
};
export const curateSilo = {
    pause: { sel: "0x8456cb59", in: [], out: [] },
    unpause: { sel: "0x3f4ba83a", in: [], out: [] },
};
