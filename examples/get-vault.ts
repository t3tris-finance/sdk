/**
 * bun examples/get-vault.ts
 *
 * Env: T3TRIS_API_KEY
 */
import { createT3trisClient } from "@t3tris/sdk";

const VAULT = {
  chainId: 42161,
  address: "0x98e43a491a464f0886bc5e57207c340bbed0d01f",
} as const;

const client = createT3trisClient();
const vault = await client.vaults.get(VAULT);

console.log(`name     ${vault.displayName ?? vault.name}`);
console.log(`owner    ${vault.ownerAddress}`);
console.log(`curator  ${vault.curatorAddress}`);
