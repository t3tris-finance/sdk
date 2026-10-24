import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createT3trisClient } from "../../src/client/createClient";
import type { StreamEvent } from "../../src/entities/stream";

const BASE = "http://127.0.0.1:9";

type PendingTicket = {
  signal: AbortSignal | undefined;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

class FakeSocket {
  static sockets: FakeSocket[] = [];
  static onConstruct: (() => void) | undefined;

  readonly url: string;
  readyState = 0;
  closeCode: number | undefined;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeSocket.sockets.push(this);
    FakeSocket.onConstruct?.();
  }

  open(): void {
    if (this.readyState !== 0) return;
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  receive(data: string): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  close(code?: number): void {
    if (this.readyState === 3) return;
    this.closeCode = code ?? 1005;
    this.readyState = 3;
    this.onclose?.({ code: this.closeCode, reason: "" } as CloseEvent);
  }
}

const pendings: PendingTicket[] = [];
let fetchCount = 0;
let rejectOnAbort = false;
let originalWebSocket: typeof WebSocket;

const ticketResponse = (ticket = "tkt"): Response =>
  new Response(JSON.stringify({ ticket, expiresAt: 1 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const eventFrame = (seq: number): string => {
  const event = {
    seq,
    type: "vault.indexed",
    chainId: 1,
    vaultAddress: "0x0000000000000000000000000000000000000001",
    occurredAt: 0,
    data: {},
  } satisfies StreamEvent;
  return JSON.stringify({ kind: "event", event });
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const fetchMock: typeof fetch = (input, init) => {
  fetchCount += 1;
  const url = String(input);
  if (!url.endsWith("/v1/stream/ticket")) {
    return Promise.reject(new Error(`unexpected ${url}`));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const pending: PendingTicket = {
      signal: init?.signal ?? undefined,
      resolve: (response) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
      reject: (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      },
    };
    pendings.push(pending);
    const abort = () => {
      if (!rejectOnAbort) return;
      pending.reject(new DOMException("The operation was aborted", "AbortError"));
    };
    if (init?.signal?.aborted === true) abort();
    else init?.signal?.addEventListener("abort", abort, { once: true });
  });
};

const client = () =>
  createT3trisClient({
    baseUrl: BASE,
    apiKey: "sk_test",
    fetch: fetchMock,
  });

describe("events.subscribe abort", () => {
  beforeEach(() => {
    FakeSocket.sockets = [];
    FakeSocket.onConstruct = undefined;
    pendings.length = 0;
    fetchCount = 0;
    rejectOnAbort = false;
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  });

  afterEach(async () => {
    for (const pending of pendings) pending.resolve(ticketResponse());
    await flush();
    globalThis.WebSocket = originalWebSocket;
  });

  test("does not mint a ticket when the signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const iter = client().events.subscribe({}, { signal: ac.signal });
    await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
    expect(fetchCount).toBe(0);
    expect(FakeSocket.sockets).toHaveLength(0);
  });

  test("a ticket that resolves after abort never opens a socket", async () => {
    const ac = new AbortController();
    const iter = client().events.subscribe({ types: ["vault.indexed"] }, { signal: ac.signal });
    await flush();
    expect(pendings).toHaveLength(1);
    const pending = pendings[0];
    if (pending === undefined) throw new Error("missing ticket request");
    ac.abort();
    expect(pending.signal?.aborted).toBe(true);
    pending.resolve(ticketResponse("late"));
    await flush();
    expect(FakeSocket.sockets).toHaveLength(0);
    expect(fetchCount).toBe(1);
    await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
  });

  test("an aborted ticket fetch is not retried", async () => {
    rejectOnAbort = true;
    const delays: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      delays.push(timeout ?? 0);
      return realSetTimeout(handler as () => void, timeout, ...(args as []));
    }) as typeof setTimeout;
    try {
      const ac = new AbortController();
      const iter = client().events.subscribe({}, { signal: ac.signal });
      await flush();
      expect(pendings).toHaveLength(1);
      ac.abort();
      await flush();
      expect(FakeSocket.sockets).toHaveLength(0);
      expect(fetchCount).toBe(1);
      expect(delays.filter((ms) => ms > 0 && ms < 15_000)).toEqual([]);
      await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
  });

  test("a socket created as the signal aborts is closed without handlers", async () => {
    const ac = new AbortController();
    FakeSocket.onConstruct = () => ac.abort();
    const iter = client().events.subscribe({}, { signal: ac.signal });
    await flush();
    pendings[0]?.resolve(ticketResponse("race"));
    await flush();
    expect(FakeSocket.sockets).toHaveLength(1);
    const sock = FakeSocket.sockets[0];
    if (sock === undefined) throw new Error("missing socket");
    expect(sock.readyState).toBe(3);
    expect(sock.closeCode).toBe(1000);
    expect(sock.onmessage).toBeNull();
    sock.receive(eventFrame(1));
    await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
  });

  test("progress never acknowledges an event before the iterator consumes it", async () => {
    const ac = new AbortController();
    const progress: number[] = [];
    let ready = 0;
    const iter = client().events.subscribe(
      {},
      {
        signal: ac.signal,
        onProgress: (cursor) => progress.push(cursor),
        onReady: () => {
          ready += 1;
        },
      },
    );
    await flush();
    pendings[0]?.resolve(ticketResponse());
    await flush();
    const sock = FakeSocket.sockets[0];
    if (sock === undefined) throw new Error("missing socket");
    sock.open();
    sock.receive(JSON.stringify({ kind: "hello", cursor: 3 }));
    expect(progress).toEqual([3]);
    expect(ready).toBe(1);
    sock.receive(eventFrame(4));
    sock.receive(JSON.stringify({ kind: "hello", cursor: 4 }));
    expect(progress).toEqual([3]);
    expect((await iter.next()).value?.seq).toBe(4);
    expect(progress).toEqual([3, 4]);
    ac.abort();
  });

  test("drops queued events on abort and ignores later frames", async () => {
    const ac = new AbortController();
    const iter = client().events.subscribe({}, { signal: ac.signal });
    await flush();
    pendings[0]?.resolve(ticketResponse());
    await flush();
    const sock = FakeSocket.sockets[0];
    if (sock === undefined) throw new Error("missing socket");
    sock.open();
    const first = iter.next();
    sock.receive(eventFrame(4));
    const delivered = await first;
    expect(delivered.done).toBe(false);
    if (!delivered.done) expect(delivered.value.seq).toBe(4);

    sock.receive(eventFrame(5));
    ac.abort();
    expect(sock.readyState).toBe(3);
    sock.receive(eventFrame(6));
    sock.receive(eventFrame(7));
    await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
    await expect(iter.next()).resolves.toEqual({ value: undefined, done: true });
  });
});
