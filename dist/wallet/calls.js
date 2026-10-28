/**
 * The earn action engine — a clean, explicit port of the legacy
 * `@t3tris/sdk` wallet stack (`internal/chain.ts` + `earn/flows.ts` +
 * `earn/permit2.ts`). Callers pass a wallet client. No ABIs:
 * every op is a 4-byte selector + positional ABI params, writes are simulated
 * with a raw `eth_call` before signing, and reverts are decoded by selector
 * into produced `E_*` error codes.
 *
 * This is the layer that makes the earn deposit/redeem panel REAL — the same
 * actions the legacy app ran (deposit / requestDeposit / redeem /
 * requestRedeem / decrease / claim). The connected wallet sends them.
 */
/** The vault (ERC-4626 sync + ERC-7540 async surface) — selectors as deployed. */
export const earn = {
    underlying: { sel: "0x38d52e0f", in: [], out: [{ type: "address" }] },
    totalSupply: { sel: "0x18160ddd", in: [], out: [{ type: "uint256" }] },
    depositWithPayload: {
        sel: "0x49bdc2b8",
        in: [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
        out: [{ type: "uint256" }],
    },
    requestDeposit: {
        sel: "0xafd933fb",
        in: [{ type: "address" }, { type: "bool" }, { type: "uint256" }, { type: "bytes" }],
        out: [],
    },
    redeem: {
        sel: "0xba087652",
        in: [{ type: "uint256" }, { type: "address" }, { type: "address" }],
        out: [{ type: "uint256" }],
    },
    requestRedeem: {
        sel: "0x5fb8c2cf",
        in: [
            { type: "address" },
            { type: "address" },
            { type: "address" },
            { type: "bool" },
            { type: "uint256" },
        ],
        out: [],
    },
    decreaseDepositRequest: {
        sel: "0xd8808a86",
        in: [{ type: "address" }, { type: "bool" }, { type: "uint256" }, { type: "uint256" }],
        out: [{ type: "uint256" }, { type: "uint256" }],
    },
    decreaseRedeemRequest: {
        sel: "0x017e2fbc",
        in: [{ type: "address" }, { type: "address" }, { type: "uint256" }],
        out: [{ type: "uint256" }],
    },
    claimDeposit: { sel: "0xde56603c", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    claimRedeem: {
        sel: "0x9cb4b041",
        in: [{ type: "address" }, { type: "address" }, { type: "bool" }],
        out: [{ type: "uint256" }],
    },
    previewDeposit: { sel: "0xef8b30f7", in: [{ type: "uint256" }], out: [{ type: "uint256" }] },
    previewRedeem: { sel: "0x4cdad506", in: [{ type: "uint256" }], out: [{ type: "uint256" }] },
    maxDeposit: { sel: "0x402d267d", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    maxRedeem: { sel: "0xd905777e", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    previewClaimDeposit: { sel: "0x44b05fa2", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    /** Solady multicall — the redeem/requestRedeem claim+burn fold. */
    batch: { sel: "0xac9650d8", in: [{ type: "bytes[]" }], out: [{ type: "bytes[]" }] },
};
export const erc20 = {
    balanceOf: { sel: "0x70a08231", in: [{ type: "address" }], out: [{ type: "uint256" }] },
    allowance: {
        sel: "0xdd62ed3e",
        in: [{ type: "address" }, { type: "address" }],
        out: [{ type: "uint256" }],
    },
    approve: {
        sel: "0x095ea7b3",
        in: [{ type: "address" }, { type: "uint256" }],
        out: [{ type: "bool" }],
    },
    totalSupply: { sel: "0x18160ddd", in: [], out: [{ type: "uint256" }] },
};
/** Permit2's rolling `allowance(owner, token, spender)` — the nonce source. */
export const permit2Table = {
    allowance: {
        sel: "0x927da105",
        in: [{ type: "address" }, { type: "address" }, { type: "address" }],
        out: [{ type: "uint160" }, { type: "uint48" }, { type: "uint48" }],
    },
};
