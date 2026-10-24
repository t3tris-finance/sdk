/**
 * bun examples/listen-events.ts
 *
 * Env: T3TRIS_API_URL, T3TRIS_API_KEY (`sk_…` with `stream`).
 * Ctrl+C to stop.
 */
import { createT3trisClient } from "@t3tris/sdk";

const VAULT = {
  chainId: 42161,
  address: "0x98e43a491a464f0886bc5e57207c340bbed0d01f",
} as const;

const client = createT3trisClient();
const vault = await client.vaults.get(VAULT);
const label = vault.displayName ?? vault.name;

console.log(`listening ${label}  ${VAULT.chainId}/${VAULT.address}`);

try {
  for await (const event of client.events.subscribe()) {
    if (event.chainId !== VAULT.chainId) continue;
    if (event.vaultAddress?.toLowerCase() !== VAULT.address) continue;
    console.log(event.type);
    console.log(event.data);
  }
  console.log("closed");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  throw error;
}
