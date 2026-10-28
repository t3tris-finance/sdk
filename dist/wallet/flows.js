import { bindActions, bindReads } from "../curate/shared.js";
import { earn, erc20 } from "./calls.js";
import { encodeCall, readCall, requireAccount } from "./engine.js";
import { encodeDeployVault, previewVaultAddress } from "./factory.js";
/** Explicit contract actions. Funding, approvals, permits and claim-before-redeem are the caller's responsibility. */
export function makeDepositorActions(clients) {
    const account = () => requireAccount(clients.walletClient);
    const tx = (i, data) => ({ chainId: i.chainId, to: i.vault, data });
    const builders = {
        create: (i) => ({
            chainId: i.chainId,
            to: i.factory,
            data: encodeDeployVault(i),
        }),
        deposit: (i) => tx(i, encodeCall(earn.depositWithPayload, [
            i.receiver ?? account(),
            i.amount,
            i.permit2Data ?? "0x",
        ])),
        requestDeposit: (i) => tx(i, encodeCall(earn.requestDeposit, [
            i.controller ?? account(),
            false,
            i.amount,
            i.permit2Data ?? "0x",
        ])),
        redeem: (i) => tx(i, encodeCall(earn.redeem, [i.shares, i.receiver ?? account(), i.owner ?? account()])),
        requestRedeem: (i) => tx(i, encodeCall(earn.requestRedeem, [
            i.controller ?? account(),
            i.owner ?? account(),
            i.owner ?? account(),
            false,
            i.shares,
        ])),
        decreaseDepositRequest: (i) => tx(i, encodeCall(earn.decreaseDepositRequest, [
            i.receiver ?? account(),
            false,
            i.amount,
            i.minAmountOut,
        ])),
        decreaseRedeemRequest: (i) => tx(i, encodeCall(earn.decreaseRedeemRequest, [
            i.owner ?? account(),
            i.receiver ?? account(),
            i.shares,
        ])),
        claimDeposit: (i) => tx(i, encodeCall(earn.claimDeposit, [i.receiver ?? account()])),
        claimRedeem: (i) => tx(i, encodeCall(earn.claimRedeem, [i.owner ?? account(), i.receiver ?? account(), false])),
    };
    const read = {
        previewAddress: (i) => previewVaultAddress(clients.publicClient, i),
        asset: async (i) => (await readCall(earn.underlying, clients.publicClient, {
            address: i.vault,
            args: [],
        }))[0],
        totalSupply: async (i) => (await readCall(erc20.totalSupply, clients.publicClient, {
            address: i.vault,
            args: [],
        }))[0],
        maxDeposit: async (i) => (await readCall(earn.maxDeposit, clients.publicClient, {
            address: i.vault,
            args: [i.receiver],
        }))[0],
        maxRedeem: async (i) => (await readCall(earn.maxRedeem, clients.publicClient, {
            address: i.vault,
            args: [i.owner],
        }))[0],
        previewDeposit: async (i) => (await readCall(earn.previewDeposit, clients.publicClient, {
            address: i.vault,
            args: [i.amount],
        }))[0],
        previewRedeem: async (i) => (await readCall(earn.previewRedeem, clients.publicClient, {
            address: i.vault,
            args: [i.shares],
        }))[0],
        previewClaimDeposit: async (i) => (await readCall(earn.previewClaimDeposit, clients.publicClient, {
            address: i.vault,
            args: [i.owner],
        }))[0],
    };
    return { ...bindActions(clients, builders), read: bindReads(clients, read) };
}
export function makeTokenActions(clients) {
    return {
        ...bindActions(clients, {
            approve: (i) => ({
                chainId: i.chainId,
                to: i.token,
                data: encodeCall(erc20.approve, [i.spender, i.amount]),
            }),
        }),
        ...bindReads(clients, {
            balanceOf: async (i) => (await readCall(erc20.balanceOf, clients.publicClient, {
                address: i.token,
                args: [i.owner],
            }))[0],
            allowance: async (i) => (await readCall(erc20.allowance, clients.publicClient, {
                address: i.token,
                args: [i.owner, i.spender],
            }))[0],
        }),
    };
}
