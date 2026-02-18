/**
 * Auth routes — signup, signin, refresh, signout, me.
 *
 * Access tokens: short-lived JWT (15 min) returned in response body.
 * Refresh tokens: opaque UUID in httpOnly cookie, SHA-256 hashed in DB.
 */
import { Elysia, t } from 'elysia';
import { jwtPlugin } from '../middleware/auth-guard';
import { ApiError } from '../middleware/error-handler';
import { rateLimit } from '../middleware/rate-limit';
import { requestLogger } from '../middleware/request-logger';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  createUser,
  findUserByEmail,
  findUserById,
  findRefreshToken,
  revokeRefreshToken,
  createAndStoreRefreshToken,
  REFRESH_TOKEN_DAYS,
} from '../services/auth';
import { checkLeakedPassword } from '../lib/password-check';

const ACCESS_TOKEN_EXPIRY = process.env['JWT_ACCESS_EXPIRY'] ?? '15m';
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
    sameSite: 'strict',
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
  .use(requestLogger)
  .use(jwtPlugin)

  // -----------------------------------------------------------------------
  // POST /auth/signup
  // -----------------------------------------------------------------------
  .post(
    '/signup',
    async ({ jwt, body, cookie, set, reqLogger, ip }) => {
      rateLimit(ip, '/auth/signup');

      const [leaked, existing] = await Promise.all([
        checkLeakedPassword(body.password),
        findUserByEmail(body.email),
      ]);

      if (leaked) {
        throw new ApiError(400, 'Password found in known data breaches', 'WEAK_PASSWORD');
      }
      if (existing) {
        throw new ApiError(409, 'Email already registered', 'AUTH_EMAIL_EXISTS');
      }

      const passwordHash = await hashPassword(body.password);
      const user = await createUser(body.email, passwordHash, body.name);

      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        exp: ACCESS_TOKEN_EXPIRY,
      });

      const refreshToken = await createAndStoreRefreshToken(user.id);
      cookie[REFRESH_COOKIE_NAME].set({ value: refreshToken, ...refreshCookieOptions() });

      reqLogger.info({ event: 'auth.signup', userId: user.id }, 'user registered');
      set.status = 201;
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
    async ({ jwt, body, cookie, reqLogger, ip }) => {
      rateLimit(ip, '/auth/signin');
      const user = await findUserByEmail(body.email);
      if (!user) {
        throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
      }

      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) {
        throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
      }

      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        exp: ACCESS_TOKEN_EXPIRY,
      });

      const refreshToken = await createAndStoreRefreshToken(user.id);
      cookie[REFRESH_COOKIE_NAME].set({ value: refreshToken, ...refreshCookieOptions() });

      reqLogger.info({ event: 'auth.signin', userId: user.id }, 'user signed in');
      return { user: userResponse(user), accessToken };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )

  // -----------------------------------------------------------------------
  // POST /auth/refresh
  // -----------------------------------------------------------------------
  .post('/refresh', async ({ jwt, cookie, reqLogger, ip }) => {
    rateLimit(ip, '/auth/refresh');

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
    const newRefreshToken = await createAndStoreRefreshToken(stored.userId);

    const accessToken = await jwt.sign({
      sub: stored.userId,
      exp: ACCESS_TOKEN_EXPIRY,
    });

    refreshCookie.set({ value: newRefreshToken, ...refreshCookieOptions() });

    reqLogger.info({ event: 'auth.refresh', userId: stored.userId }, 'token refreshed');
    return { accessToken };
  })

  // -----------------------------------------------------------------------
  // POST /auth/signout
  // -----------------------------------------------------------------------
  .post('/signout', async ({ cookie, set, reqLogger, ip }) => {
    rateLimit(ip, '/auth/signout');

    const refreshCookie = cookie[REFRESH_COOKIE_NAME];
    const tokenValue = refreshCookie?.value;

    if (tokenValue && typeof tokenValue === 'string') {
      const tokenHash = await hashToken(tokenValue);
      await revokeRefreshToken(tokenHash);
    }

    refreshCookie?.remove();
    reqLogger.info({ event: 'auth.signout' }, 'user signed out');
    set.status = 204;
  })

  // -----------------------------------------------------------------------
  // GET /auth/me — return current user info from bearer token
  // -----------------------------------------------------------------------
  .get('/me', async ({ jwt, headers }) => {
    const authorization = headers['authorization'];
    if (!authorization?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid authorization header', 'UNAUTHORIZED');
    }

    const payload = await jwt.verify(authorization.slice(7));
    if (!payload || typeof payload['sub'] !== 'string') {
      throw new ApiError(401, 'Invalid or expired token', 'TOKEN_INVALID');
    }

    const user = await findUserById(payload['sub']);
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return { id: user.id, email: user.email, name: user.name };
  });
