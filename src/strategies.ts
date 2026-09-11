export interface BucketConfig {
  readonly capacity: number;
  readonly refillRate: number;
  readonly intervalMs: number;
}

export interface StrategyResult {
  tokens: number;
  lastRefill: number;
}

export interface Strategy {
  readonly name: string;
  refill(currentTokens: number, lastRefill: number, now: number, config: BucketConfig): StrategyResult;
  timeUntilAvailable(tokensNeeded: number, currentTokens: number, lastRefill: number, now: number, config: BucketConfig): number;
  reset(): void;
}

export class SlidingWindowStrategy implements Strategy {
  readonly name = 'sliding-window';

  refill(currentTokens: number, lastRefill: number, now: number, config: BucketConfig): StrategyResult {
    if (now <= lastRefill) return { tokens: currentTokens, lastRefill };
    const elapsed = now - lastRefill;
    const tokensToAdd = (elapsed / config.intervalMs) * config.refillRate;
    return { tokens: Math.min(config.capacity, currentTokens + tokensToAdd), lastRefill: now };
  }

  timeUntilAvailable(tokensNeeded: number, currentTokens: number, _lastRefill: number, _now: number, config: BucketConfig): number {
    if (currentTokens >= tokensNeeded) return 0;
    const deficit = tokensNeeded - currentTokens;
    return Math.max(0, Math.ceil(deficit / (config.refillRate / config.intervalMs)));
  }

  reset(): void {}
}

export class FixedWindowStrategy implements Strategy {
  readonly name = 'fixed-window';

  refill(currentTokens: number, lastRefill: number, now: number, config: BucketConfig): StrategyResult {
    if (now <= lastRefill) return { tokens: currentTokens, lastRefill };
    const elapsed = now - lastRefill;
    const windowsPassed = Math.floor(elapsed / config.intervalMs);
    if (windowsPassed === 0) return { tokens: currentTokens, lastRefill };

    return {
      tokens: Math.min(config.capacity, currentTokens + windowsPassed * config.refillRate),
      lastRefill: lastRefill + windowsPassed * config.intervalMs,
    };
  }

  timeUntilAvailable(tokensNeeded: number, currentTokens: number, lastRefill: number, now: number, config: BucketConfig): number {
    if (currentTokens >= tokensNeeded) return 0;
    const remainder = Math.max(0, now - lastRefill) % config.intervalMs;
    return Math.max(0, config.intervalMs - remainder);
  }

  reset(): void {}
}
