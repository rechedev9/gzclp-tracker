/**
 * Auth service — password hashing, refresh token management, user CRUD.
 * Framework-agnostic: no Elysia dependency. JWT signing handled in routes.
 */
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';

// ---------------------------------------------------------------------------
// Password hashing (Bun built-in Argon2id)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, 'argon2id');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

// ---------------------------------------------------------------------------
// Refresh token helpers
// ---------------------------------------------------------------------------

/** Generates a cryptographically random refresh token. */
export function generateRefreshToken(): string {
  return crypto.randomUUID();
}

/** SHA-256 hash of a token for safe DB storage. */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export type UserRow = typeof users.$inferSelect;

export async function createUser(
  email: string,
  passwordHash: string,
  name?: string
): Promise<UserRow> {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash, name: name ?? null })
    .returning();

  if (!user) {
    throw new Error('Failed to create user');
  }
  return user;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return user;
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

// ---------------------------------------------------------------------------
// Refresh token storage
// ---------------------------------------------------------------------------

export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
}

export async function findRefreshToken(
  tokenHash: string
): Promise<typeof refreshTokens.$inferSelect | undefined> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);
  return token;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
