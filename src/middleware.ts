import { createBucket } from './index.js';

/** HTTP middleware factory for rate limiting incoming requests. */
export function rateLimitMiddleware(options: {
  capacity: number;
  refillRate: number;
  keyExtractor?: (req: { ip?: string }) => string;
}) {
  const buckets = new Map<string, ReturnType<typeof createBucket>>();
  const getKey = options.keyExtractor ?? ((req: { ip?: string }) => req.ip ?? 'global');

  return (req: { ip?: string }, res: { status(code: number): void; end(body: string): void }, next: () => void) => {
    const key = getKey(req);
    if (!buckets.has(key)) {
      buckets.set(key, createBucket({ capacity: options.capacity, refillRate: options.refillRate }));
    }
    const bucket = buckets.get(key)!;
    if (bucket.tryConsume()) {
      next();
    } else {
      res.status(429);
      res.end('Too Many Requests');
    }
  };
}
