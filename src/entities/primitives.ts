/** On-chain primitives — hex-literal branded strings, JSON-safe by design. */
export type Address = `0x${string}`;
export type Hash = `0x${string}`;

/** Stable reference to an on-chain entity (vault, asset, …). */
export interface VaultRef {
  chainId: number;
  address: Address;
}

export interface AssetRef {
  chainId: number;
  address: Address;
}
