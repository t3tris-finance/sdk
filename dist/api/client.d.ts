import { type RequestOptions } from "./inputs.js";
import type { T3trisClient } from "./types.js";
/** Non-2xx answer from the API. `code` is machine-readable ("not_found", …). */
export declare class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly options: {
        requestId?: string;
        retryAfterMs?: number;
        headers?: Headers;
        cause?: unknown;
    };
    constructor(status: number, code: string, message: string, options?: {
        requestId?: string;
        retryAfterMs?: number;
        headers?: Headers;
        cause?: unknown;
    });
    /** Correlate an SDK error with API logs/support. */
    get requestId(): string | undefined;
    /** Server-directed retry delay when the response included Retry-After. */
    get retryAfterMs(): number | undefined;
    /** Response headers are retained for advanced callers. */
    get headers(): Headers | undefined;
}
export interface T3trisClientOptions {
    /** API origin. Precedence: explicit baseUrl, T3TRIS_API_URL, then
     * https://api.t3tris.finance. */
    baseUrl?: string;
    /** API key (`sk_…`). Server-side only — never ship it to a browser.
     * Defaults to `T3TRIS_API_KEY`. The key identifies the caller; a session
     * (`ss_…`) never replaces it. Protected methods take `{ session }` per call. */
    apiKey?: string;
    /** Extra headers (auth proxies, tracing). */
    headers?: Record<string, string>;
    /** Fetch implementation; defaults to globalThis.fetch. */
    fetch?: typeof fetch;
    /** Default transport controls for every request from this client. Create a
     * second client when one logical operation needs different controls. */
    requestOptions?: RequestOptions;
}
export declare function createApiClient(options?: T3trisClientOptions): T3trisClient;
