import { describe, expect, test } from "bun:test";
import { createT3trisClient } from "../../src/client";

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("catalog.listAssets", () => {
  test("a page object is query params, not chainId=%5Bobject%20Object%5D", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input));
      return json({ items: [] });
    };
    const client = createT3trisClient({
      baseUrl: "https://api.test",
      apiKey: "sk_test",
      fetch: fetchImpl,
    });

    await client.catalog.listAssets({ limit: 10 });
    expect(urls[0]).toBe("https://api.test/v1/assets?limit=10");
    expect(urls[0]).not.toContain("chainId=");
    expect(urls[0]).not.toContain("chainId=%5Bobject%20Object%5D");
    expect(urls[0]).not.toContain("chainId=%5Bobject+Object%5D");

    await client.catalog.listAssets({ chainId: 42161, limit: 10, cursor: "abc" });
    const filtered = new URL(urls[1] ?? "");
    expect(filtered.searchParams.get("chainId")).toBe("42161");
    expect(filtered.searchParams.get("limit")).toBe("10");
    expect(filtered.searchParams.get("cursor")).toBe("abc");
    expect(urls[1]).not.toContain("chainId=%5Bobject%20Object%5D");
  });
});
