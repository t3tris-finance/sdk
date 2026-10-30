import { createPublicClient, createWalletClient, custom, } from "viem";
import { makeOracleActions } from "./oracles/index.js";
import { readPermit2Allowance } from "./permit2/index.js";
import { makeRoleActions } from "./roles/index.js";
import { makeTokenActions } from "./tokens/index.js";
import { bindReads } from "./transport/bindings.js";
import { makeDepositorActions } from "./vaults/actions.js";
import { makeVaultActions } from "./vaults/admin.js";
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
