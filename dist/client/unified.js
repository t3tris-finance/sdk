import { createApiClient } from "./createClient.js";
import { createOnchainClient } from "./onchain.js";
export function createT3trisClient(options = {}) {
    if (("provider" in options && options.provider !== undefined) ||
        ("walletClient" in options && options.walletClient !== undefined)) {
        if ("apiKey" in options || "baseUrl" in options) {
            throw new Error("Use separate API and wallet clients. Never provide an API key to a browser wallet client.");
        }
        return createOnchainClient(options);
    }
    return createApiClient(options);
}
