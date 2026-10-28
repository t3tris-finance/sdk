import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
} from "viem";
import { makeOracleActions } from "../curate/oracle";
import { makeRoleActions } from "../curate/roles";
import { bindReads } from "../curate/shared";
import { makeVaultActions } from "../curate/vault";
import type { OnchainClients, PublicClientSource, WalletClientSource } from "../wallet/engine";
import { makeDepositorActions, makeTokenActions } from "../wallet/flows";
import { readPermit2Allowance } from "../wallet/permit2";

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
