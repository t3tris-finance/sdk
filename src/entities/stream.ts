/** A business event from the /v0/stream outbox feed. `seq` is strictly
 * monotone per API deployment — consumers resume from the last seq seen. */
export interface StreamEvent {
  seq: number;
  type: string;
  chainId: number;
  vaultAddress: string | null;
  /** Unix seconds. */
  occurredAt: number;
  data: Record<string, unknown>;
}
