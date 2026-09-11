import { FixedWindowStrategy, SlidingWindowStrategy } from './strategies.js';
import type { BucketConfig, Strategy, StrategyResult } from './strategies.js';

export { FixedWindowStrategy, SlidingWindowStrategy };
export type { BucketConfig, Strategy, StrategyResult };
export type StrategyType = 'sliding-window' | 'fixed-window';

export interface BucketOptions {
  capacity: number;
  refillRate: number;
  intervalMs?: number;
  initialTokens?: number;
  strategy?: StrategyType | Strategy;
}

export class RateLimiter {
  readonly capacity: number;
  readonly refillRate: number;
  readonly intervalMs: number;
  private readonly strategy: Strategy;
  private tokens: number;
  private lastRefill = Date.now();
  private readonly initialTokens: number;

  constructor(options: BucketOptions) {
    if (options.capacity <= 0 || options.refillRate <= 0) {
      throw new RangeError('capacity and refillRate must be positive numbers');
    }
    if (options.intervalMs !== undefined && options.intervalMs <= 0) {
      throw new RangeError('intervalMs must be a positive number');
    }
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.intervalMs = options.intervalMs ?? 1000;
    this.initialTokens = options.initialTokens ?? this.capacity;
    this.tokens = this.initialTokens;
    this.strategy = typeof options.strategy === 'object' ? options.strategy
      : options.strategy === 'fixed-window' ? new FixedWindowStrategy() : new SlidingWindowStrategy();
  }

  private getConfig(): BucketConfig {
    return { capacity: this.capacity, refillRate: this.refillRate, intervalMs: this.intervalMs };
  }

  private refill(): void {
    const res = this.strategy.refill(this.tokens, this.lastRefill, Date.now(), this.getConfig());
    this.tokens = res.tokens;
    this.lastRefill = res.lastRefill;
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  tryConsume(tokens: number = 1): boolean {
    if (tokens <= 0) throw new RangeError('Tokens to consume must be > 0');
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  async waitForToken(): Promise<void> {
    while (!this.tryConsume(1)) {
      const waitMs = this.strategy.timeUntilAvailable(1, this.tokens, this.lastRefill, Date.now(), this.getConfig());
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(1, waitMs)));
    }
  }

  reset(): void {
    this.tokens = this.initialTokens;
    this.lastRefill = Date.now();
    this.strategy.reset();
  }
}

export function createBucket(options: BucketOptions): RateLimiter {
  return new RateLimiter(options);
}
