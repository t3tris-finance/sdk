/** A supported EVM chain. Seeded from config, not user-editable. */
export interface Chain {
  id: number; // EIP-155 chain id
  key: string; // slug — "arbitrum"
  name: string;
  explorerUrl: string;
  enabled: boolean;
}
