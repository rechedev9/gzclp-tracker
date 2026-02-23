/**
 * In-memory token-bucket rate limiter.
 * Keyed by endpoint + IP; resets after WINDOW_MS.
 */
import { ApiError } from './error-handler';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per endpoint per IP per window

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(ip: string, endpoint: string): void {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  // Lazy cleanup: sweep expired entries to keep the Map bounded
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }

  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED');
  }
}
