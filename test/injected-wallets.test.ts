import { describe, expect, test } from "bun:test";
import type { EIP1193Provider } from "viem";
import {
  type DiscoveredWallet,
  preferredInjectedWallet,
  watchInjectedWallets,
} from "../src/onchain/transport/provider";

function provider(): EIP1193Provider {
  return { request: async () => [] } as EIP1193Provider;
}

function target() {
  const node = new EventTarget();
  return node as EventTarget & {
    ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] };
  };
}

function wallet(rdns: string, uuid = rdns): DiscoveredWallet {
  return { uuid, name: rdns, icon: "", rdns, provider: provider() };
}

describe("preferred injected wallet", () => {
  test("a saved wallet is not replaced by the first announcement", () => {
    const rabby = wallet("io.rabby");
    const meta = wallet("io.metamask");
    expect(preferredInjectedWallet([rabby], "io.metamask", "io.metamask")).toBeUndefined();
    expect(preferredInjectedWallet([rabby, meta], "io.metamask", "io.metamask")).toBe(meta);
  });

  test("one installed wallet is used only when nothing was saved", () => {
    const rabby = wallet("io.rabby");
    expect(preferredInjectedWallet([rabby], null, null)).toBe(rabby);
    expect(preferredInjectedWallet([rabby, wallet("io.metamask")], null, null)).toBeUndefined();
  });
});

describe("injected wallet discovery", () => {
  test("publishes every wallet that answers the EIP-6963 request", () => {
    const host = target();
    const rabby = provider();
    const meta = provider();
    host.addEventListener("eip6963:requestProvider", () => {
      host.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: { uuid: "rabby", name: "Rabby", icon: "", rdns: "io.rabby" },
            provider: rabby,
          },
        }),
      );
      host.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: { uuid: "metamask", name: "MetaMask", icon: "", rdns: "io.metamask" },
            provider: meta,
          },
        }),
      );
    });
    const seen: DiscoveredWallet[][] = [];
    const stop = watchInjectedWallets((wallets) => seen.push(wallets), host);
    expect(
      seen
        .at(-1)
        ?.map((wallet) => wallet.name)
        .sort(),
    ).toEqual(["MetaMask", "Rabby"]);
    expect(seen).toHaveLength(1);
    stop();
  });

  test("a wallet that also owns window.ethereum is listed once", () => {
    const host = target();
    const rabby = provider();
    host.ethereum = rabby;
    host.addEventListener("eip6963:requestProvider", () => {
      host.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: { uuid: "rabby", name: "Rabby", icon: "", rdns: "io.rabby" },
            provider: rabby,
          },
        }),
      );
    });
    const seen: DiscoveredWallet[][] = [];
    watchInjectedWallets((wallets) => seen.push(wallets), host);
    expect(seen.at(-1)?.map((wallet) => wallet.name)).toEqual(["Rabby"]);
  });

  test("with no announcement the legacy provider is one browser wallet", () => {
    const host = target();
    const only = provider();
    host.ethereum = only;
    const seen: DiscoveredWallet[][] = [];
    watchInjectedWallets((wallets) => seen.push(wallets), host);
    expect(seen.at(-1)).toEqual([
      {
        uuid: "legacy:0",
        name: "Browser wallet",
        icon: "",
        rdns: "legacy:0",
        provider: only,
      },
    ]);
  });
});
