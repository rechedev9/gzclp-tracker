import type Redis from 'ioredis';

const PRESENCE_TTL_SEC = 60;
const PRESENCE_KEY_PREFIX = 'user:online:';

/** Fire-and-forget: mark a user as active for the next 60 seconds. */
export function trackPresence(userId: string, redis: Redis): Promise<unknown> {
  return redis.setex(`${PRESENCE_KEY_PREFIX}${userId}`, PRESENCE_TTL_SEC, '1');
}

/** Count all keys matching user:online:* via incremental SCAN (never blocks Redis). */
export async function countOnlineUsers(redis: Redis): Promise<number> {
  let count = 0;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      `${PRESENCE_KEY_PREFIX}*`,
      'COUNT',
      100
    );
    cursor = nextCursor;
    count += keys.length;
  } while (cursor !== '0');
  return count;
}
