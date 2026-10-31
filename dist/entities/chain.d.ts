/** A supported EVM chain. Seeded from config, not user-editable. */
export interface Chain {
    id: number;
    key: string;
    name: string;
    explorerUrl: string;
    enabled: boolean;
}
