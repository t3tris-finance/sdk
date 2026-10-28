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
import type { Hex } from "viem";
/** One positional ABI param. `components` carries the field list for a tuple
 * (and for arrays of tuples); flat scalars omit it. */
export interface AbiParam {
    type: string;
    components?: readonly AbiParam[];
}
export interface CallSpec {
    sel: Hex;
    in: readonly AbiParam[];
    out: readonly AbiParam[];
}
/** The vault (ERC-4626 sync + ERC-7540 async surface) — selectors as deployed. */
export declare const earn: {
    readonly underlying: {
        readonly sel: "0x38d52e0f";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "address";
        }];
    };
    readonly totalSupply: {
        readonly sel: "0x18160ddd";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly depositWithPayload: {
        readonly sel: "0x49bdc2b8";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "uint256";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly requestDeposit: {
        readonly sel: "0xafd933fb";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }, {
            readonly type: "bytes";
        }];
        readonly out: readonly [];
    };
    readonly redeem: {
        readonly sel: "0xba087652";
        readonly in: readonly [{
            readonly type: "uint256";
        }, {
            readonly type: "address";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly requestRedeem: {
        readonly sel: "0x5fb8c2cf";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "address";
        }, {
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [];
    };
    readonly decreaseDepositRequest: {
        readonly sel: "0xd8808a86";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "bool";
        }, {
            readonly type: "uint256";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }, {
            readonly type: "uint256";
        }];
    };
    readonly decreaseRedeemRequest: {
        readonly sel: "0x017e2fbc";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "address";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly claimDeposit: {
        readonly sel: "0xde56603c";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly claimRedeem: {
        readonly sel: "0x9cb4b041";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "address";
        }, {
            readonly type: "bool";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly previewDeposit: {
        readonly sel: "0xef8b30f7";
        readonly in: readonly [{
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly previewRedeem: {
        readonly sel: "0x4cdad506";
        readonly in: readonly [{
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly maxDeposit: {
        readonly sel: "0x402d267d";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly maxRedeem: {
        readonly sel: "0xd905777e";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly previewClaimDeposit: {
        readonly sel: "0x44b05fa2";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    /** Solady multicall — the redeem/requestRedeem claim+burn fold. */
    readonly batch: {
        readonly sel: "0xac9650d8";
        readonly in: readonly [{
            readonly type: "bytes[]";
        }];
        readonly out: readonly [{
            readonly type: "bytes[]";
        }];
    };
};
export declare const erc20: {
    readonly balanceOf: {
        readonly sel: "0x70a08231";
        readonly in: readonly [{
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly allowance: {
        readonly sel: "0xdd62ed3e";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
    readonly approve: {
        readonly sel: "0x095ea7b3";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "uint256";
        }];
        readonly out: readonly [{
            readonly type: "bool";
        }];
    };
    readonly totalSupply: {
        readonly sel: "0x18160ddd";
        readonly in: readonly [];
        readonly out: readonly [{
            readonly type: "uint256";
        }];
    };
};
/** Permit2's rolling `allowance(owner, token, spender)` — the nonce source. */
export declare const permit2Table: {
    readonly allowance: {
        readonly sel: "0x927da105";
        readonly in: readonly [{
            readonly type: "address";
        }, {
            readonly type: "address";
        }, {
            readonly type: "address";
        }];
        readonly out: readonly [{
            readonly type: "uint160";
        }, {
            readonly type: "uint48";
        }, {
            readonly type: "uint48";
        }];
    };
};
