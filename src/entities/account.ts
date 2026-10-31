import type { Position } from "./position";
import type { Address } from "./primitives";
import type { Vault } from "./vault";

/** A wallet's portfolio: every indexed position plus the directory record of
 * each vault behind one. The vaults join is visibility-blind (the same
 * contract as /v0/vaults/refs) so a wallet's own private positions still
 * resolve names and config. The set is returned whole — bounded by the
 * positions page cap, no cursor. */
export interface AccountPortfolio {
  address: Address;
  positions: Position[];
  vaults: Vault[];
}
