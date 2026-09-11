# ts-rate-bucket

A high-performance, zero-dependency token bucket rate limiter for TypeScript and Node.js. Supports both sliding window and fixed window refill strategies for API requests and task scheduling.

## Features

- **Token Bucket Algorithm**: Burstable rate limiting with configurable capacity and refill rate.
- **Flexible Strategies**: Continuous `sliding-window` or interval-aligned `fixed-window`.
- **Async Queueing**: Asynchronously wait for available tokens via `waitForToken()`.
- **Zero Dependencies**: Lightweight, strict TypeScript definitions, and pure ES module build.

## Installation

```bash
npm install ts-rate-bucket
```

## Quick Start

```typescript
import { createBucket } from 'ts-rate-bucket';

const limiter = createBucket({
  capacity: 10,
  refillRate: 10,
  intervalMs: 1000,
  strategy: 'sliding-window',
});

// Non-blocking consumption
if (limiter.tryConsume()) {
  await makeApiCall();
}

// Blocking consumption (waits until token is replenished)
await limiter.waitForToken();
await makeApiCall();
```

## API Reference

### `createBucket(options: BucketOptions): RateLimiter`

- `capacity`: Maximum token capacity of the bucket.
- `refillRate`: Number of tokens replenished per interval.
- `intervalMs`: Refill interval duration in milliseconds (default: `1000`).
- `initialTokens`: Initial token count (default: `capacity`).
- `strategy`: `'sliding-window'` (default) or `'fixed-window'`.

### `RateLimiter` Methods

- `tryConsume(tokens?: number): boolean`: Consumes tokens if available.
- `waitForToken(): Promise<void>`: Waits until at least one token is available and consumes it.
- `reset(): void`: Resets the bucket to initial tokens.

## License

MIT
