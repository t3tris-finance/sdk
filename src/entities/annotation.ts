import type { Address, Hash } from "./primitives";

/** A labeled external link attached to a chart annotation. Bare hashes from
 * legacy rows are resolved against the vault explorer by the UI. */
export interface AnnotationLink {
  title: string;
  url: string;
}

/** A curator-pinned chart event ("NAV set", "rebalance", …). */
export interface VaultAnnotation {
  id: string;
  chainId: number;
  vaultAddress: Address;
  ts: number; // unix s
  title: string;
  body?: string;
  authorAddress: Address;
  links: AnnotationLink[];
  /** Legacy single-hash convenience field. New clients should use links. */
  txHash?: Hash;
}
