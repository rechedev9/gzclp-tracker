/**
 * Auth guard — JWT verification for protected routes.
 *
 * Two exports:
 * - `jwtPlugin` — Elysia plugin that adds `jwt.sign()` and `jwt.verify()` to context
 * - `resolveUserId()` — Standalone function that extracts userId from JWT in auth header
 *
 * Routes that need auth should: `.use(jwtPlugin).resolve(resolveUserId)`
 * This pattern ensures TypeScript correctly infers `userId` in the handler context.
 */
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { ApiError } from './error-handler';
import { logger } from '../lib/logger';

const rawSecret = process.env['JWT_SECRET'];
if (process.env['NODE_ENV'] === 'production') {
  if (!rawSecret || rawSecret === 'dev-secret-change-me') {
    throw new Error('JWT_SECRET env var must be set to a secure value in production');
  }
  if (rawSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
} else if (!rawSecret) {
  logger.warn('JWT_SECRET not set — using insecure default. MUST NOT be used in production.');
}
const JWT_SECRET = rawSecret ?? 'dev-secret-change-me';

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' }).use(
  jwt({
    name: 'jwt',
    secret: JWT_SECRET,
  })
);

/**
 * Resolve function for protected routes.
 * Verifies the Bearer token and returns `{ userId }` to be merged into context.
 */
export async function resolveUserId({
  jwt: jwtCtx,
  headers,
}: {
  jwt: { verify: (token?: string) => Promise<Record<string, unknown> | false> };
  headers: Record<string, string | undefined>;
}): Promise<{ userId: string }> {
  const authorization = headers['authorization'];
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const token = authorization.slice(7);
  const payload = await jwtCtx.verify(token);

  if (!payload) {
    throw new ApiError(401, 'Invalid or expired token', 'TOKEN_INVALID');
  }

  const userId = payload['sub'];
  if (typeof userId !== 'string') {
    throw new ApiError(401, 'Invalid token payload', 'TOKEN_INVALID');
  }

  return { userId };
}
