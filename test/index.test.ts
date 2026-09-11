import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBucket,
  SlidingWindowStrategy,
  FixedWindowStrategy,
} from '../src/index.js';

test('RateLimiter - basic token consumption', () => {
  const bucket = createBucket({
    capacity: 3,
    refillRate: 1,
    intervalMs: 1000,
  });

  assert.equal(bucket.tryConsume(1), true);
  assert.equal(bucket.tryConsume(1), true);
  assert.equal(bucket.tryConsume(1), true);
  assert.equal(bucket.tryConsume(1), false);
});

test('RateLimiter - multi-token consumption', () => {
  const bucket = createBucket({
    capacity: 5,
    refillRate: 1,
    intervalMs: 1000,
  });

  assert.equal(bucket.tryConsume(3), true);
  assert.equal(bucket.tryConsume(3), false);
  assert.equal(bucket.tryConsume(2), true);
  assert.equal(bucket.tryConsume(1), false);
});

test('RateLimiter - validation errors', () => {
  assert.throws(() => createBucket({ capacity: 0, refillRate: 1 }), RangeError);
  assert.throws(() => createBucket({ capacity: 5, refillRate: 0 }), RangeError);
  assert.throws(() => createBucket({ capacity: 5, refillRate: 1, intervalMs: -1 }), RangeError);

  const bucket = createBucket({ capacity: 5, refillRate: 1 });
  assert.throws(() => bucket.tryConsume(0), RangeError);
  assert.throws(() => bucket.tryConsume(-1), RangeError);
});

test('RateLimiter - reset restores tokens', () => {
  const bucket = createBucket({
    capacity: 2,
    refillRate: 1,
    intervalMs: 1000,
  });

  assert.equal(bucket.tryConsume(2), true);
  assert.equal(bucket.tryConsume(1), false);

  bucket.reset();
  assert.equal(bucket.tryConsume(2), true);
});

test('SlidingWindowStrategy - calculation', () => {
  const strategy = new SlidingWindowStrategy();
  const config = { capacity: 10, refillRate: 10, intervalMs: 1000 };

  const start = 1000;
  // 500ms elapsed = 5 tokens refilled
  const result = strategy.refill(0, start, start + 500, config);
  assert.equal(result.tokens, 5);
  assert.equal(result.lastRefill, 1500);

  // Time until available
  assert.equal(strategy.timeUntilAvailable(1, 0, start, start, config), 100);
});

test('FixedWindowStrategy - calculation', () => {
  const strategy = new FixedWindowStrategy();
  const config = { capacity: 10, refillRate: 10, intervalMs: 1000 };

  const start = 1000;
  // 999ms elapsed = 0 windows passed -> 0 tokens
  const r1 = strategy.refill(0, start, start + 999, config);
  assert.equal(r1.tokens, 0);

  // 1000ms elapsed = 1 window passed -> 10 tokens
  const r2 = strategy.refill(0, start, start + 1000, config);
  assert.equal(r2.tokens, 10);
  assert.equal(r2.lastRefill, 2000);
});

test('RateLimiter - waitForToken resolves when available', async () => {
  const bucket = createBucket({
    capacity: 1,
    refillRate: 100,
    intervalMs: 1000,
  });

  assert.equal(bucket.tryConsume(1), true);
  assert.equal(bucket.tryConsume(1), false);

  const start = Date.now();
  await bucket.waitForToken();
  const elapsed = Date.now() - start;

  assert.ok(elapsed >= 5);
});
