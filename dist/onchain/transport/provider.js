/** Optional discovery helper. Client construction never requests wallet access. */
export function injectedProvider() {
    return typeof window === "undefined"
        ? null
        : (window.ethereum ?? null);
}
export function preferredInjectedWallet(wallets, savedRdns, savedUuid) {
    if (savedRdns || savedUuid)
        return wallets.find((wallet) => wallet.rdns === savedRdns || wallet.uuid === savedUuid);
    return wallets.length === 1 ? wallets[0] : undefined;
}
export function watchInjectedWallets(onChange, target = typeof window === "undefined" ? null : window) {
    if (!target) {
        onChange([]);
        return () => { };
    }
    const found = new Map();
    let initial = true;
    const remember = (wallet) => {
        for (const [key, row] of found)
            if (row.provider === wallet.provider)
                found.delete(key);
        found.set(wallet.uuid, wallet);
    };
    const publish = () => onChange([...found.values()]);
    const onAnnounce = (event) => {
        const detail = event.detail;
        const info = detail?.info;
        if (!info?.uuid || !detail.provider)
            return;
        remember({
            uuid: info.uuid,
            name: info.name || "Browser wallet",
            icon: info.icon ?? "",
            rdns: info.rdns || info.uuid,
            provider: detail.provider,
        });
        if (!initial)
            publish();
    };
    target.addEventListener("eip6963:announceProvider", onAnnounce);
    target.dispatchEvent(new Event("eip6963:requestProvider"));
    initial = false;
    if (!found.size) {
        const eth = target.ethereum;
        const list = eth?.providers?.length ? eth.providers : eth ? [eth] : [];
        list.forEach((provider, index) => {
            remember({
                uuid: `legacy:${index}`,
                name: list.length === 1 ? "Browser wallet" : `Browser wallet ${index + 1}`,
                icon: "",
                rdns: `legacy:${index}`,
                provider,
            });
        });
    }
    publish();
    return () => target.removeEventListener("eip6963:announceProvider", onAnnounce);
}
export async function requestAccounts(provider) {
    return provider.request({ method: "eth_requestAccounts" });
}
export async function fetchChainId(provider) {
    return Number.parseInt(await provider.request({ method: "eth_chainId" }), 16);
}
