/** Interface for distributed rate limiting across multiple processes. */
export interface DistributedStore {
  get(key: string): Promise<{ tokens: number; lastRefill: number } | null>;
  set(key: string, state: { tokens: number; lastRefill: number }, ttlMs: number): Promise<void>;
}

export class InMemoryStore implements DistributedStore {
  private store = new Map<string, { tokens: number; lastRefill: number; expires: number }>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expires) return null;
    return { tokens: entry.tokens, lastRefill: entry.lastRefill };
  }

  async set(key: string, state: { tokens: number; lastRefill: number }, ttlMs: number) {
    this.store.set(key, { ...state, expires: Date.now() + ttlMs });
  }
}
