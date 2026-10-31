import { afterEach, describe, expect, test } from "bun:test";
import { createT3trisClient } from "../../src/client";

const previousUrl = process.env.T3TRIS_API_URL;
afterEach(() => {
  if (previousUrl === undefined) delete process.env.T3TRIS_API_URL;
  else process.env.T3TRIS_API_URL = previousUrl;
});

function transport() {
  const requests: { url: string; authorization: string | null }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return Response.json({ items: [] });
  };
  return { requests, fetchImpl };
}

describe("production API default", () => {
  test("works with only an API key and no URL configuration", async () => {
    delete process.env.T3TRIS_API_URL;
    const { requests, fetchImpl } = transport();
    const client = createT3trisClient({ apiKey: "sk_test_default", fetch: fetchImpl });
    await client.catalog.listChains();
    expect(requests).toEqual([
      { url: "https://api.t3tris.finance/v0/chains", authorization: "Bearer sk_test_default" },
    ]);
    expect(() => createT3trisClient()).not.toThrow();
  });

  test("preserves environment API URL overrides", async () => {
    process.env.T3TRIS_API_URL = "https://unexpected.example";
    const { requests, fetchImpl } = transport();
    await createT3trisClient({ fetch: fetchImpl }).catalog.listChains();
    expect(requests[0]?.url).toBe("https://unexpected.example/v0/chains");
  });

  test("an empty environment URL falls back to production", async () => {
    process.env.T3TRIS_API_URL = "";
    const { requests, fetchImpl } = transport();
    await createT3trisClient({ fetch: fetchImpl }).catalog.listChains();
    expect(requests[0]?.url).toBe("https://api.t3tris.finance/v0/chains");
  });

  test("explicit initialization takes precedence over the environment", async () => {
    process.env.T3TRIS_API_URL = "https://unexpected.example";
    const { requests, fetchImpl } = transport();
    const client = createT3trisClient({ baseUrl: "http://127.0.0.1:42114/", fetch: fetchImpl });
    await client.catalog.listChains();
    expect(requests[0]?.url).toBe("http://127.0.0.1:42114/v0/chains");
  });
});
