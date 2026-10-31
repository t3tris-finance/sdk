import { SESSION_HEADER, } from "./inputs.js";
/** Non-2xx answer from the API. `code` is machine-readable ("not_found", …). */
export class ApiError extends Error {
    status;
    code;
    options;
    constructor(status, code, message, options = {}) {
        super(message, { cause: options.cause });
        this.status = status;
        this.code = code;
        this.options = options;
        this.name = "ApiError";
    }
    /** Correlate an SDK error with API logs/support. */
    get requestId() {
        return this.options.requestId;
    }
    /** Server-directed retry delay when the response included Retry-After. */
    get retryAfterMs() {
        return this.options.retryAfterMs;
    }
    /** Response headers are retained for advanced callers. */
    get headers() {
        return this.options.headers;
    }
}
const readEnv = (key) => {
    const value = globalThis.process
        ?.env?.[key];
    return value === undefined || value === "" ? undefined : value;
};
const q = (params) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === "")
            continue;
        if (Array.isArray(v)) {
            if (v.length === 0)
                continue;
            search.set(k, v.join(","));
        }
        else {
            search.set(k, String(v));
        }
    }
    const s = search.toString();
    return s ? `?${s}` : "";
};
const refPath = (prefix, ref) => `${prefix}/${ref.chainId}/${encodeURIComponent(ref.address)}`;
const retryAfterMs = (headers) => {
    const value = headers.get("retry-after");
    if (value === null)
        return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0)
        return seconds * 1_000;
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(date - Date.now(), 0);
};
const wait = (ms, signal) => new Promise((resolve, reject) => {
    const abort = () => {
        clearTimeout(timer);
        reject(signal?.reason ?? new DOMException("The operation was aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted)
        abort();
});
export function createApiClient(options = {}) {
    const base = (options.baseUrl ??
        readEnv("T3TRIS_API_URL") ??
        "https://api.t3tris.finance").replace(/\/$/, "");
    const apiKey = options.apiKey ?? readEnv("T3TRIS_API_KEY");
    const doFetch = options.fetch ?? fetch;
    const controls = options.requestOptions;
    if (controls?.retries !== undefined &&
        (!Number.isSafeInteger(controls.retries) || controls.retries < 0))
        throw new RangeError("requestOptions.retries must be a non-negative safe integer.");
    if (controls?.timeoutMs !== undefined &&
        (!Number.isFinite(controls.timeoutMs) || controls.timeoutMs <= 0))
        throw new RangeError("requestOptions.timeoutMs must be a positive finite number.");
    const authHeaders = (session) => ({
        ...(apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` }),
        ...(session === undefined ? {} : { [SESSION_HEADER]: session }),
    });
    const request = async (path, init, auth) => {
        const controls = options.requestOptions;
        const method = init?.method?.toUpperCase() ?? "GET";
        // Retries are opt-in. Callers that opt in get safe GET retries only;
        // mutations are never retried without API idempotency keys.
        const retries = method === "GET" ? (controls?.retries ?? 0) : 0;
        // Per-call signal (subscribe's AbortSignal rides the ticket POST). The
        // client-wide requestOptions.signal still aborts every request.
        const callerSignal = init?.signal ?? undefined;
        for (let attempt = 0;; attempt++) {
            const timeout = controls?.timeoutMs ?? 15_000;
            const controller = new AbortController();
            const abortFromControl = () => controller.abort(controls?.signal?.reason);
            const abortFromCaller = () => controller.abort(callerSignal?.reason);
            if (controls?.signal?.aborted)
                abortFromControl();
            else
                controls?.signal?.addEventListener("abort", abortFromControl, { once: true });
            if (callerSignal?.aborted)
                abortFromCaller();
            else
                callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
            const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeout);
            try {
                const res = await doFetch(`${base}${path}`, {
                    ...init,
                    cache: "no-store",
                    signal: controller.signal,
                    headers: (() => {
                        const headers = new Headers(options.headers);
                        new Headers(init?.headers).forEach((value, name) => {
                            headers.set(name, value);
                        });
                        headers.delete("authorization");
                        headers.delete(SESSION_HEADER);
                        for (const [name, value] of Object.entries(authHeaders(auth?.session)))
                            headers.set(name, value);
                        return headers;
                    })(),
                });
                const errorOptions = {
                    headers: res.headers,
                    requestId: res.headers.get("x-request-id") ?? undefined,
                    retryAfterMs: retryAfterMs(res.headers),
                };
                if (!res.ok) {
                    let code = "error";
                    let message = res.statusText;
                    try {
                        const body = (await res.json());
                        code = body.error?.code ?? code;
                        message = body.error?.message ?? message;
                    }
                    catch {
                        // non-JSON error body — keep statusText
                    }
                    throw new ApiError(res.status, code, message, errorOptions);
                }
                const text = await res.text();
                if (text === "")
                    return undefined;
                try {
                    return JSON.parse(text);
                }
                catch {
                    throw new ApiError(res.status, "invalid_response", "API returned invalid JSON", errorOptions);
                }
            }
            catch (error) {
                const retryable = error instanceof ApiError ? error.status >= 500 : !controller.signal.aborted;
                if (attempt >= retries || !retryable) {
                    if (error instanceof ApiError)
                        throw error;
                    const timeoutCause = controller.signal.reason;
                    const timedOut = timeoutCause instanceof DOMException && timeoutCause.name === "TimeoutError";
                    if (timedOut)
                        throw new ApiError(0, "timeout", "API request timed out", { cause: error });
                    if (controller.signal.aborted) {
                        throw new ApiError(0, "aborted", "API request was aborted", { cause: error });
                    }
                    throw new ApiError(0, "network_error", "API request failed", { cause: error });
                }
                const delay = error instanceof ApiError ? error.retryAfterMs : undefined;
                try {
                    await wait(delay ?? Math.min(250 * 2 ** attempt, 2_000), controls?.signal);
                }
                catch (cause) {
                    throw new ApiError(0, "aborted", "API request was aborted", { cause });
                }
            }
            finally {
                clearTimeout(timer);
                controls?.signal?.removeEventListener("abort", abortFromControl);
                callerSignal?.removeEventListener("abort", abortFromCaller);
            }
        }
    };
    const jsonInit = (method, body) => ({
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    /** The live event stream as an async iterator: reconnects with backoff and
     * resumes from the last seen seq; auth denials throw, `signal` abort and
     * clean closes end the iteration. The durable key never rides the WS URL —
     * each (re)connect mints a short-lived single-use ticket over HTTPS first.
     * `onProgress` reports the acknowledged server cursor (hello watermarks
     * included): persist it to resume a later subscription cheaply. */
    const subscribe = (filter = {}, subscribeOptions = {}) => {
        if (apiKey === undefined) {
            throw new Error("events.subscribe: create the client with an apiKey (sk_… with stream)");
        }
        const wsBase = base.replace(/^http/, "ws");
        let cursor = filter.since ?? 0;
        let attempt = 0;
        let ended = false;
        let failure;
        let socket;
        let retry;
        const queue = [];
        let waiters = [];
        const settle = () => {
            while (waiters.length > 0 && queue.length > 0) {
                const waiter = waiters.shift();
                const event = queue.shift();
                if (waiter !== undefined && event !== undefined) {
                    cursor = Math.max(cursor, event.seq);
                    subscribeOptions.onProgress?.(cursor);
                    waiter.resolve({ value: event, done: false });
                }
            }
            if (queue.length === 0 && (ended || failure !== undefined)) {
                const pending = waiters;
                waiters = [];
                for (const waiter of pending) {
                    if (failure !== undefined)
                        waiter.reject(failure);
                    else
                        waiter.resolve({ value: undefined, done: true });
                }
            }
        };
        const close = () => {
            if (ended)
                return;
            ended = true;
            subscribeOptions.signal?.removeEventListener("abort", close);
            if (retry !== undefined)
                clearTimeout(retry);
            retry = undefined;
            socket?.close(1000);
            // Hand already-queued events to parked waiters, then drop the rest so a
            // late frame cannot keep the array alive after the consumer is gone.
            settle();
            queue.length = 0;
        };
        const connect = async () => {
            if (ended)
                return;
            let ticket;
            try {
                const minted = await request("/v1/stream/ticket", {
                    method: "POST",
                    signal: subscribeOptions.signal,
                });
                ticket = minted.ticket;
            }
            catch (error) {
                // Abort won the mint. close() already ran and will not close a socket
                // opened later, and it will not run again — do not schedule a retry.
                if (ended)
                    return;
                // A mint denial is the terminal auth failure; anything else retries
                // with the same backoff as a dropped socket.
                if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                    failure = error;
                    close();
                    return;
                }
                retry = setTimeout(() => void connect(), Math.min(30_000, 500 * 2 ** attempt++));
                return;
            }
            if (ended)
                return;
            const params = new URLSearchParams({ ticket, since: String(cursor) });
            if (filter.live === true && cursor === 0)
                params.set("live", "1");
            if (filter.types !== undefined && filter.types.length > 0) {
                params.set("types", filter.types.join(","));
            }
            const opened = new WebSocket(`${wsBase}/v1/stream?${params.toString()}`);
            // Constructor can abort synchronously. close() already returned and
            // will not see this socket — close it here and do not attach handlers.
            if (ended) {
                opened.close(1000);
                return;
            }
            socket = opened;
            let ready = false;
            socket.onopen = () => {
                attempt = 0;
            };
            socket.onmessage = (ev) => {
                if (ended)
                    return;
                let msg;
                try {
                    msg = JSON.parse(String(ev.data));
                }
                catch {
                    return;
                }
                if (msg.kind === "hello" && typeof msg.cursor === "number") {
                    // The server watermark advances across rows our filter skipped —
                    // adopting it keeps the next resume cheap and stall-free.
                    if (queue.length === 0 && msg.cursor > cursor) {
                        cursor = msg.cursor;
                        subscribeOptions.onProgress?.(cursor);
                    }
                    if (!ready) {
                        ready = true;
                        subscribeOptions.onReady?.();
                    }
                    return;
                }
                if (msg.kind === "event" && msg.event !== undefined) {
                    if (msg.event.seq <= Math.max(cursor, queue.at(-1)?.seq ?? 0))
                        return;
                    queue.push(msg.event);
                    settle();
                }
            };
            socket.onclose = (ev) => {
                // Auth denials are terminal and surface as errors; clean closes end
                // the iteration; everything else reconnects with backoff, resuming
                // from the last seen seq.
                if (ev.code === 4401 || ev.code === 4403) {
                    failure = new ApiError(ev.code === 4401 ? 401 : 403, "stream_denied", ev.reason || "stream access denied");
                    close();
                    return;
                }
                if (ended || ev.code === 1000) {
                    close();
                    return;
                }
                retry = setTimeout(() => void connect(), Math.min(30_000, 500 * 2 ** attempt++));
            };
        };
        subscribeOptions.signal?.addEventListener("abort", close, { once: true });
        if (subscribeOptions.signal?.aborted === true) {
            close();
        }
        else {
            void connect();
        }
        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            next() {
                const queued = queue.shift();
                if (queued !== undefined) {
                    cursor = Math.max(cursor, queued.seq);
                    subscribeOptions.onProgress?.(cursor);
                    return Promise.resolve({ value: queued, done: false });
                }
                if (failure !== undefined)
                    return Promise.reject(failure);
                if (ended)
                    return Promise.resolve({ value: undefined, done: true });
                return new Promise((resolve, reject) => {
                    waiters.push({ resolve, reject });
                });
            },
            return() {
                close();
                return Promise.resolve({ value: undefined, done: true });
            },
        };
    };
    return {
        catalog: {
            listChains: (input) => request(`/v1/chains${q({ ...input })}`),
            listAssets: (input) => request(`/v1/assets${q({ ...input })}`),
        },
        billing: {
            getPricing: () => request("/v1/billing/pricing"),
            getUsage: () => request("/v1/key/usage"),
        },
        vaults: {
            list: (input) => request(`/v1/vaults${q({
                chainIds: input?.chainIds?.join(","),
                assetAddress: input?.assetAddress,
                curatorAddress: input?.curatorAddress,
                kind: input?.kind,
                verified: input?.verified,
                search: input?.search,
                sort: input?.sort,
                direction: input?.direction,
                limit: input?.limit,
                cursor: input?.cursor,
            })}`),
            get: (ref) => request(`/${refPath("v1/vaults", ref)}`),
            getMany: async (refs) => {
                if (refs.length > 100)
                    throw new RangeError("vaults.getMany accepts at most 100 references.");
                if (refs.length === 0)
                    return [];
                const page = await request(`/v1/vaults/refs${q({ refs: refs.map((r) => `${r.chainId}:${r.address.toLowerCase()}`).join(",") })}`);
                return page.items;
            },
            listHistory: (ref, input) => request(`/${refPath("v1/vaults", ref)}/history${q({
                range: input?.range,
                limit: input?.limit,
                cursor: input?.cursor,
            })}`),
            getComposition: (ref) => request(`/${refPath("v1/vaults", ref)}/composition`),
            listActivity: (ref, input) => request(`/${refPath("v1/vaults", ref)}/activity${q({ ...input })}`),
            listAnnotations: (ref, input) => request(`/${refPath("v1/vaults", ref)}/annotations${q({ limit: input?.limit, cursor: input?.cursor })}`),
            getGovernance: (ref) => request(`/${refPath("v1/vaults", ref)}/governance`),
            updateMetadata: (ref, input, auth) => request(`/${refPath("v1/vaults", ref)}/metadata`, jsonInit("PUT", input), auth),
            createAnnotation: (ref, input, auth) => request(`/${refPath("v1/vaults", ref)}/annotations`, jsonInit("POST", input), auth),
            updateAnnotation: (ref, annotationId, input, auth) => request(`/${refPath("v1/vaults", ref)}/annotations/${encodeURIComponent(annotationId)}`, jsonInit("PUT", input), auth),
            deleteAnnotation: async (ref, annotationId, auth) => {
                await request(`/${refPath("v1/vaults", ref)}/annotations/${encodeURIComponent(annotationId)}`, { method: "DELETE" }, auth);
            },
        },
        accounts: {
            portfolio: (input) => request(`/v1/accounts/${input.address.toLowerCase()}/portfolio`),
            listVaults: (input) => request(`/v1/accounts/${input.address.toLowerCase()}/vaults${q({
                limit: input.limit,
                cursor: input.cursor,
            })}`),
            listPositions: (input) => request(`/v1/accounts/${input.address.toLowerCase()}/positions${q({
                chainId: input.chainId,
                limit: input.limit,
                cursor: input.cursor,
            })}`),
            listActivity: (input) => request(`/v1/accounts/${input.address.toLowerCase()}/activity${q({
                chainId: input.chainId,
                limit: input.limit,
                cursor: input.cursor,
                categories: input.categories,
            })}`),
            listFavorites: (input) => request(`/v1/accounts/${input.address.toLowerCase()}/favorites`),
            setFavorite: (input, auth) => request(`/v1/accounts/${input.address.toLowerCase()}/favorites`, jsonInit("PUT", {
                chainId: input.chainId,
                vault: input.vault,
                ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
            }), auth),
            deleteFavorite: async (input, auth) => {
                await request(`/v1/accounts/${input.address.toLowerCase()}/favorites/${input.chainId}/${input.vault.toLowerCase()}`, { method: "DELETE" }, auth);
            },
        },
        events: {
            list: (input) => request(`/v1/events${q({
                after: input?.after,
                types: input?.types?.join(","),
                limit: input?.limit,
                cursor: input?.cursor,
            })}`),
            subscribe,
        },
        keys: {
            create: (input) => request("/v1/key/subkeys", jsonInit("POST", input)),
            attachVault: (input) => request("/v1/key/vaults", jsonInit("POST", input)),
            detachVault: (input) => request("/v1/key/vaults", jsonInit("DELETE", input)),
            listVaults: (input) => request(`/v1/key/vaults${q({ limit: input?.limit, cursor: input?.cursor, keyId: input?.keyId })}`),
            hasVaults: (refs) => {
                if (refs.length > 100)
                    throw new RangeError("hasVaults accepts at most 100 references");
                if (refs.length === 0)
                    return Promise.resolve([]);
                return request("/v1/key/vaults/exists", jsonInit("POST", { refs }));
            },
        },
        auth: {
            createSiweNonce: (input) => request("/v1/auth/siwe/nonce", jsonInit("POST", input)),
            verifySiwe: (input) => request("/v1/auth/siwe/verify", jsonInit("POST", input)),
            registerEmail: (input) => request("/v1/auth/email/register", jsonInit("POST", input)),
            loginEmail: (input) => request("/v1/auth/email/login", jsonInit("POST", input)),
            whoami: (auth) => request("/v1/auth/whoami", undefined, auth),
            logout: async (auth) => {
                await request("/v1/auth/logout", { method: "POST" }, auth);
            },
            logoutAll: async (auth) => {
                await request("/v1/auth/logout-all", { method: "POST" }, auth);
            },
        },
    };
}
