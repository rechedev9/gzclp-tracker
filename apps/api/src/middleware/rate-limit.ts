/**
 * Sliding-window rate limiter.
 * Keyed by endpoint + IP; tracks individual request timestamps in a rolling
 * window so burst attacks at window boundaries are prevented.
 *
 * NOTE: in-memory only — state resets on restart and is not shared across
 * multiple API instances. Add a Redis store for horizontal scaling.
 */
import { ApiError } from './error-handler';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per endpoint per IP per window
const CLEANUP_EVERY_N = 100; // sweep stale keys every N calls

// Stores sorted request timestamps per key (endpoint:ip)
const windows = new Map<string, number[]>();
let callCount = 0;

export function rateLimit(ip: string, endpoint: string): void {
  const key = `${endpoint}:${ip}`;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Slide the window: discard timestamps outside the rolling interval
  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= MAX_REQUESTS) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED');
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  // Periodic sweep: remove fully-expired keys to keep the Map bounded
  if (++callCount % CLEANUP_EVERY_N === 0) {
    for (const [k, ts] of windows) {
      if (ts.every((t) => t <= cutoff)) windows.delete(k);
    }
  }
}
