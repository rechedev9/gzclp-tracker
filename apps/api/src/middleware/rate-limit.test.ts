process.env['LOG_LEVEL'] = 'silent';

import { describe, it, expect } from 'bun:test';
import { MemoryRateLimitStore } from './rate-limit';

describe('MemoryRateLimitStore', () => {
  it('allows a request when the count is under the limit', async () => {
    const store = new MemoryRateLimitStore();
    const allowed = await store.check('test:key', 60_000, 5);
    expect(allowed).toBe(true);
  });

  it('blocks the request that exceeds the limit', async () => {
    const store = new MemoryRateLimitStore();
    for (let i = 0; i < 5; i++) {
      await store.check('test:block', 60_000, 5);
    }
    const blocked = await store.check('test:block', 60_000, 5);
    expect(blocked).toBe(false);
  });

  it('uses separate counters per key so different keys do not interfere', async () => {
    const store = new MemoryRateLimitStore();
    for (let i = 0; i < 5; i++) {
      await store.check('key:a', 60_000, 5);
    }
    const allowed = await store.check('key:b', 60_000, 5);
    expect(allowed).toBe(true);
  });

  it('allows requests again after the window expires', async () => {
    const store = new MemoryRateLimitStore();
    // Fill up a 1ms window
    for (let i = 0; i < 3; i++) {
      await store.check('test:expire', 1, 3);
    }
    // Wait for the window to pass
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    const allowed = await store.check('test:expire', 1, 3);
    expect(allowed).toBe(true);
  });
});
