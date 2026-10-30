import { describe, expect, test } from "bun:test";
import { ApiError, createT3trisClient } from "../../src";

const ref = { chainId: 42161, address: "0x1111111111111111111111111111111111111111" as const };

describe("API collection contracts", () => {
  test("key attachments are a complete array rather than a page", async () => {
    const urls: string[] = [];
    const client = createT3trisClient({
      fetch: async (url) => {
        urls.push(String(url));
        return Response.json({ items: [ref] });
      },
    });
    expect(await client.keys.listVaults()).toEqual([ref]);
    expect(new URL(urls[0] ?? "").pathname).toBe("/v1/key/vaults");
    expect(new URL(urls[0] ?? "").search).toBe("");
  });
  test("empty and oversized explicit-reference lookups never perform IO", async () => {
    let calls = 0;
    const client = createT3trisClient({
      fetch: async () => {
        calls++;
        return Response.json({ items: [] });
      },
    });
    expect(await client.vaults.getMany([])).toEqual([]);
    await expect(client.vaults.getMany(Array.from({ length: 101 }, () => ref))).rejects.toThrow(
      "at most 100",
    );
    expect(calls).toBe(0);
  });
  test("all paginated method families forward limit and opaque cursor", async () => {
    const urls: URL[] = [];
    const client = createT3trisClient({
      fetch: async (url) => {
        urls.push(new URL(String(url)));
        return Response.json({ items: [], nextCursor: "next" });
      },
    });
    const page = { limit: 7, cursor: "opaque/+=?" };
    const calls = [
      () => client.catalog.listChains(page),
      () => client.catalog.listAssets(page),
      () => client.vaults.list(page),
      () => client.vaults.listHistory(ref, page),
      () => client.vaults.listActivity(ref, page),
      () => client.vaults.listAnnotations(ref, page),
      () => client.accounts.listVaults({ ...page, address: ref.address }),
      () => client.accounts.listPositions({ ...page, address: ref.address }),
      () => client.accounts.listActivity({ ...page, address: ref.address }),
      () => client.events.list(page),
    ];
    for (const call of calls) expect((await call()).nextCursor).toBe("next");
    for (const url of urls) {
      expect(url.searchParams.get("limit")).toBe("7");
      expect(url.searchParams.get("cursor")).toBe(page.cursor);
    }
  });
  test("annotation identifiers remain one escaped path segment", async () => {
    const urls: string[] = [];
    const client = createT3trisClient({
      fetch: async (url) => {
        urls.push(String(url));
        return Response.json({});
      },
    });
    await client.vaults.updateAnnotation(
      ref,
      "a/b?c#d",
      { ts: 1, title: "Title" },
      { session: "ss_test" },
    );
    await client.vaults.deleteAnnotation(ref, "a/b?c#d", { session: "ss_test" });
    for (const url of urls) expect(url).toEndWith("/annotations/a%2Fb%3Fc%23d");
  });
});

describe("transport controls", () => {
  test("rejects invalid transport configuration", () => {
    for (const retries of [-1, 0.5, NaN, Infinity])
      expect(() => createT3trisClient({ requestOptions: { retries } })).toThrow(RangeError);
    for (const timeoutMs of [0, -1, NaN, Infinity])
      expect(() => createT3trisClient({ requestOptions: { timeoutMs } })).toThrow(RangeError);
  });
  test("explicit credentials cannot be overridden by extra headers", async () => {
    let headers = new Headers();
    const client = createT3trisClient({
      apiKey: "sk_expected",
      headers: { authorization: "Bearer sk_wrong", "x-t3tris-session": "ss_wrong" },
      fetch: async (_, init) => {
        headers = new Headers(init?.headers);
        return Response.json({});
      },
    });
    await client.auth.whoami({ session: "ss_expected" });
    expect(headers.get("authorization")).toBe("Bearer sk_expected");
    expect(headers.get("x-t3tris-session")).toBe("ss_expected");
  });
  test("cancellation during retry backoff is an ApiError and stops retries", async () => {
    const controller = new AbortController();
    let calls = 0;
    const client = createT3trisClient({
      requestOptions: { retries: 2, signal: controller.signal },
      fetch: async () => {
        calls++;
        controller.abort();
        return Response.json(
          { error: { code: "unavailable", message: "Retry later" } },
          { status: 503 },
        );
      },
    });
    try {
      await client.catalog.listChains();
      throw new Error("expected cancellation");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 0, code: "aborted" });
    }
    expect(calls).toBe(1);
  });
});
