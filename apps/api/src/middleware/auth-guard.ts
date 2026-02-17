/**
 * Auth guard — Elysia derive plugin that verifies JWT access tokens.
 * Injects `userId` into the handler context for protected routes.
 */
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { ApiError } from './error-handler';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' }).use(
  jwt({
    name: 'jwt',
    secret: JWT_SECRET,
  })
);

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwtPlugin)
  .derive(async ({ jwt: jwtCtx, headers }) => {
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
  });
