import { createPublicClient, createWalletClient, custom, } from "viem";
import { makeOracleActions } from "../curate/oracle.js";
import { makeRoleActions } from "../curate/roles.js";
import { bindReads } from "../curate/shared.js";
import { makeVaultActions } from "../curate/vault.js";
import { makeDepositorActions, makeTokenActions } from "../wallet/flows.js";
import { readPermit2Allowance } from "../wallet/permit2.js";
export function createOnchainClient(options) {
    let clients;
    if (options.provider) {
        const transport = custom(options.provider);
        clients = {
            walletClient: createWalletClient({ account: options.account, transport }),
            publicClient: createPublicClient({ transport }),
        };
    }
    else {
        clients = { walletClient: options.walletClient, publicClient: options.publicClient };
    }
    const admin = makeVaultActions(clients);
    const depositor = makeDepositorActions(clients);
    return {
        vaults: { ...admin, ...depositor, read: { ...admin.read, ...depositor.read } },
        roles: makeRoleActions(clients),
        oracles: makeOracleActions(clients),
        tokens: makeTokenActions(clients),
        permit2: bindReads(clients, {
            allowance: (input) => readPermit2Allowance(clients.publicClient, input),
        }),
    };
}
