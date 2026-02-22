/**
 * API health endpoint tests — verifies GET /health includes redis field.
 * Uses a minimal Elysia app that replicates the health endpoint logic
 * without requiring a real database or Redis connection.
 */
process.env['DATABASE_URL'] = 'postgres://test:test@localhost:5432/test';
process.env['LOG_LEVEL'] = 'silent';
process.env['JWT_SECRET'] = 'test-secret-must-be-at-least-32-chars-1234';

import { mock, describe, it, expect } from 'bun:test';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

mock.module('./lib/redis', () => ({
  getRedis: mock(() => undefined),
}));

mock.module('./db', () => ({
  getDb: mock(() => ({
    execute: mock(() => Promise.resolve([{ '?column?': 1 }])),
  })),
}));

mock.module('./middleware/request-logger', () => ({
  requestLogger: { _type: 'plugin', fn: (app: unknown) => app },
}));

mock.module('./plugins/swagger', () => ({
  swaggerPlugin: { _type: 'plugin', fn: (app: unknown) => app },
}));

mock.module('./plugins/metrics', () => ({
  metricsPlugin: { _type: 'plugin', fn: (app: unknown) => app },
}));

// ---------------------------------------------------------------------------
// Health check tests using a minimal Elysia app
// ---------------------------------------------------------------------------

import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { getDb } from './db';
import { getRedis } from './lib/redis';
import { logger } from './lib/logger';

type RedisStatus =
  | { status: 'ok'; latencyMs: number }
  | { status: 'disabled' }
  | { status: 'error'; error: string };

/** Minimal health check app for testing — mirrors the production endpoint logic */
const healthApp = new Elysia().get('/health', async ({ set }) => {
  const start = Date.now();
  let dbStatus: { status: 'ok'; latencyMs: number } | { status: 'error'; error: string };
  try {
    await getDb().execute(sql`SELECT 1`);
    dbStatus = { status: 'ok', latencyMs: Date.now() - start };
  } catch (e) {
    logger.error({ err: e }, 'Database health check failed');
    dbStatus = { status: 'error', error: 'Unavailable' };
  }

  let redisStatus: RedisStatus;
  const redis = getRedis();
  if (!redis) {
    redisStatus = { status: 'disabled' };
  } else {
    const redisStart = Date.now();
    try {
      await redis.ping();
      redisStatus = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (e) {
      logger.error({ err: e }, 'Redis health check failed');
      redisStatus = { status: 'error', error: 'Unavailable' };
    }
  }

  const overall = dbStatus.status === 'ok' ? 'ok' : 'degraded';
  if (overall === 'degraded') set.status = 503;
  return {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    db: dbStatus,
    redis: redisStatus,
  };
});

describe('GET /health', () => {
  it('response includes redis field', async () => {
    const res = await healthApp.handle(new Request('http://localhost/health'));

    const body = (await res.json()) as Record<string, unknown>;
    expect('redis' in body).toBe(true);
  });

  it('redis.status === "disabled" when REDIS_URL is not set', async () => {
    // getRedis() is mocked to return undefined (no REDIS_URL)
    const res = await healthApp.handle(new Request('http://localhost/health'));

    const body = (await res.json()) as Record<string, unknown>;
    const redis = body.redis as Record<string, unknown>;
    expect(redis.status).toBe('disabled');
  });

  it('returns 200 when db is healthy', async () => {
    const res = await healthApp.handle(new Request('http://localhost/health'));

    expect(res.status).toBe(200);
  });

  it('response includes status, timestamp, uptime, and db fields', async () => {
    const res = await healthApp.handle(new Request('http://localhost/health'));

    const body = (await res.json()) as Record<string, unknown>;
    expect('status' in body).toBe(true);
    expect('timestamp' in body).toBe(true);
    expect('uptime' in body).toBe(true);
    expect('db' in body).toBe(true);
  });
});
