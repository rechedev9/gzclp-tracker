/**
 * Auth service tests — pure functions and DB-error path.
 *
 * The pure function tests (generateRefreshToken, hashToken, REFRESH_TOKEN_DAYS)
 * do not touch the DB. Task 4.12 tests the DB-write-error path of
 * findOrCreateGoogleUser by mocking getDb().
 *
 * mock.module() is hoisted and intercepts any transitively imported DB calls.
 */
process.env['DATABASE_URL'] = 'postgres://test:test@localhost:5432/test';
process.env['LOG_LEVEL'] = 'silent';

import { mock, describe, it, expect } from 'bun:test';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

// DB query chain: insert().values().returning() → [] (empty = failed insert)
const mockReturning = mock(() => Promise.resolve([]));
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

// select().from().where().limit() → [] (no existing user → triggers insert branch)
const mockLimit = mock(() => Promise.resolve([]));
const mockWhere = mock(() => ({ limit: mockLimit }));
const mockFrom = mock(() => ({ where: mockWhere }));
const mockSelect = mock(() => ({ from: mockFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
};

mock.module('../db', () => ({
  getDb: mock(() => mockDb),
}));

import {
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_DAYS,
  findOrCreateGoogleUser,
} from './auth';
import { ApiError } from '../middleware/error-handler';

// ---------------------------------------------------------------------------
// Refresh token generation
// ---------------------------------------------------------------------------

describe('generateRefreshToken', () => {
  it('should return a non-empty string', () => {
    const token = generateRefreshToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should return a UUID-format string', () => {
    const token = generateRefreshToken();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(uuidPattern.test(token)).toBe(true);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateRefreshToken()));
    expect(tokens.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Token hashing
// ---------------------------------------------------------------------------

describe('hashToken', () => {
  it('should return a 64-character hex string (SHA-256)', async () => {
    const hash = await hashToken('some-token');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('should be deterministic — same input always gives same hash', async () => {
    const token = 'deterministic-token';
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await hashToken('token-a');
    const hash2 = await hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  it('should match known SHA-256 output', async () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = await hashToken('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('REFRESH_TOKEN_DAYS', () => {
  it('should be 7', () => {
    expect(REFRESH_TOKEN_DAYS).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 4.12: findOrCreateGoogleUser — DB write error path
// ---------------------------------------------------------------------------

describe('findOrCreateGoogleUser — DB_WRITE_ERROR', () => {
  it('4.12: throws ApiError with code DB_WRITE_ERROR and status 500 when insert returns empty array', async () => {
    // Arrange: mockReturning returns [] → insert produced no row
    mockReturning.mockImplementation(() => Promise.resolve([]));
    mockLimit.mockImplementation(() => Promise.resolve([])); // no existing user

    // Act
    let thrown: unknown;
    try {
      await findOrCreateGoogleUser('google-sub-123', 'user@example.com', 'Test User');
    } catch (e) {
      thrown = e;
    }

    // Assert
    expect(thrown instanceof ApiError).toBe(true);
    expect((thrown as ApiError).code).toBe('DB_WRITE_ERROR');
    expect((thrown as ApiError).statusCode).toBe(500);
  });
});
