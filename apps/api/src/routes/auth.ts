/**
 * Auth routes — signup, signin, refresh, signout.
 *
 * Access tokens: short-lived JWT (15 min) returned in response body.
 * Refresh tokens: opaque UUID in httpOnly cookie, SHA-256 hashed in DB.
 */
import { Elysia, t } from 'elysia';
import { jwtPlugin } from '../middleware/auth-guard';
import { ApiError } from '../middleware/error-handler';
import { rateLimit } from '../middleware/rate-limit';
import {
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  hashToken,
  createUser,
  findUserByEmail,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} from '../services/auth';

const ACCESS_TOKEN_EXPIRY = process.env['JWT_ACCESS_EXPIRY'] ?? '15m';
const REFRESH_TOKEN_DAYS = 7;
const REFRESH_COOKIE_NAME = 'refresh_token';

function isProductionEnv(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function refreshCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    path: '/auth',
  };
}

function userResponse(user: { id: string; email: string; name: string | null }): {
  id: string;
  email: string;
  name: string | null;
} {
  return { id: user.id, email: user.email, name: user.name };
}

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  // -----------------------------------------------------------------------
  // POST /auth/signup
  // -----------------------------------------------------------------------
  .post(
    '/signup',
    async ({ jwt, body, cookie, request }) => {
      rateLimit(request.headers.get('x-forwarded-for') ?? 'unknown', '/auth/signup');
      const existing = await findUserByEmail(body.email);
      if (existing) {
        throw new ApiError(409, 'Email already registered', 'AUTH_EMAIL_EXISTS');
      }

      const passwordHash = await hashPassword(body.password);
      const user = await createUser(body.email, passwordHash, body.name);

      // Generate tokens
      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        exp: ACCESS_TOKEN_EXPIRY,
      });

      const refreshToken = generateRefreshToken();
      const tokenHash = await hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
      await storeRefreshToken(user.id, tokenHash, expiresAt);

      // Set refresh token cookie
      cookie[REFRESH_COOKIE_NAME].set({
        value: refreshToken,
        ...refreshCookieOptions(),
      });

      return { user: userResponse(user), accessToken };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      }),
    }
  )

  // -----------------------------------------------------------------------
  // POST /auth/signin
  // -----------------------------------------------------------------------
  .post(
    '/signin',
    async ({ jwt, body, cookie, request }) => {
      rateLimit(request.headers.get('x-forwarded-for') ?? 'unknown', '/auth/signin');
      const user = await findUserByEmail(body.email);
      if (!user) {
        throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
      }

      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) {
        throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
      }

      // Generate tokens
      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        exp: ACCESS_TOKEN_EXPIRY,
      });

      const refreshToken = generateRefreshToken();
      const tokenHash = await hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
      await storeRefreshToken(user.id, tokenHash, expiresAt);

      // Set refresh token cookie
      cookie[REFRESH_COOKIE_NAME].set({
        value: refreshToken,
        ...refreshCookieOptions(),
      });

      return { user: userResponse(user), accessToken };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )

  // -----------------------------------------------------------------------
  // POST /auth/refresh
  // -----------------------------------------------------------------------
  .post('/refresh', async ({ jwt, cookie }) => {
    const refreshCookie = cookie[REFRESH_COOKIE_NAME];
    const tokenValue = refreshCookie?.value;

    if (!tokenValue || typeof tokenValue !== 'string') {
      throw new ApiError(401, 'No refresh token', 'AUTH_NO_REFRESH_TOKEN');
    }

    const tokenHash = await hashToken(tokenValue);
    const stored = await findRefreshToken(tokenHash);

    if (!stored) {
      throw new ApiError(401, 'Invalid refresh token', 'AUTH_INVALID_REFRESH');
    }

    if (stored.expiresAt < new Date()) {
      await revokeRefreshToken(tokenHash);
      refreshCookie.remove();
      throw new ApiError(401, 'Refresh token expired', 'AUTH_REFRESH_EXPIRED');
    }

    // Rotate: revoke old token, issue new one
    await revokeRefreshToken(tokenHash);

    const newRefreshToken = generateRefreshToken();
    const newTokenHash = await hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await storeRefreshToken(stored.userId, newTokenHash, expiresAt);

    // New access token
    const accessToken = await jwt.sign({
      sub: stored.userId,
      exp: ACCESS_TOKEN_EXPIRY,
    });

    // Set new refresh cookie
    refreshCookie.set({
      value: newRefreshToken,
      ...refreshCookieOptions(),
    });

    return { accessToken };
  })

  // -----------------------------------------------------------------------
  // POST /auth/signout
  // -----------------------------------------------------------------------
  .post('/signout', async ({ cookie, set }) => {
    const refreshCookie = cookie[REFRESH_COOKIE_NAME];
    const tokenValue = refreshCookie?.value;

    if (tokenValue && typeof tokenValue === 'string') {
      const tokenHash = await hashToken(tokenValue);
      await revokeRefreshToken(tokenHash);
    }

    refreshCookie?.remove();
    set.status = 204;
  });
