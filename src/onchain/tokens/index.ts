import type { Address } from "viem";
import { erc20 } from "../abi/vault";
import { bindActions, bindReads } from "../transport/bindings";
import { encodeCall, type OnchainClients, readCall } from "../transport/engine";

export function makeTokenActions(clients: OnchainClients) {
  return {
    ...bindActions(clients, {
      approve: (i: { chainId: number; token: Address; spender: Address; amount: bigint }) => ({
        chainId: i.chainId,
        to: i.token,
        data: encodeCall(erc20.approve, [i.spender, i.amount]),
      }),
    }),
    ...bindReads(clients, {
      balanceOf: async (i: { token: Address; owner: Address }) =>
        (
          await readCall<[bigint]>(erc20.balanceOf, clients.publicClient, {
            address: i.token,
            args: [i.owner],
          })
        )[0],
      allowance: async (i: { token: Address; owner: Address; spender: Address }) =>
        (
          await readCall<[bigint]>(erc20.allowance, clients.publicClient, {
            address: i.token,
            args: [i.owner, i.spender],
          })
        )[0],
    }),
  };
}
