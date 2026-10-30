import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
} from "viem";
import { makeOracleActions } from "./oracles";
import { readPermit2Allowance } from "./permit2";
import { makeRoleActions } from "./roles";
import { makeTokenActions } from "./tokens";
import { bindReads } from "./transport/bindings";
import type { OnchainClients, PublicClientSource, WalletClientSource } from "./transport/engine";
import { makeDepositorActions } from "./vaults/actions";
import { makeVaultActions } from "./vaults/admin";

export type WalletOptions =
  | {
      walletClient: WalletClientSource;
      publicClient: PublicClientSource;
      provider?: never;
      account?: never;
    }
  | { provider: EIP1193Provider; account: Address; walletClient?: never; publicClient?: never };

export function createOnchainClient(options: WalletOptions) {
  let clients: OnchainClients;
  if (options.provider) {
    const transport = custom(options.provider);
    clients = {
      walletClient: createWalletClient({ account: options.account, transport }),
      publicClient: createPublicClient({ transport }),
    };
  } else {
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
      allowance: (input: { owner: Address; token: Address; spender: Address }) =>
        readPermit2Allowance(clients.publicClient, input),
    }),
  };
}
export type T3trisWalletClient = ReturnType<typeof createOnchainClient>;
