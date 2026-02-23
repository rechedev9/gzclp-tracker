import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '../lib/logger';
import { dbQueriesTotal } from '../lib/metrics';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'other';

function deriveQueryType(sql: string): QueryType {
  const keyword = sql.trimStart().split(/\s+/)[0]?.toLowerCase() ?? 'other';
  if (
    keyword === 'select' ||
    keyword === 'insert' ||
    keyword === 'update' ||
    keyword === 'delete'
  ) {
    return keyword;
  }
  return 'other';
}

let _client: postgres.Sql | undefined;
let _db: DbInstance | undefined;

const devQueryLogger =
  process.env['NODE_ENV'] !== 'production'
    ? {
        logQuery(query: string, params: unknown[]): void {
          logger.debug({ sql: query, params }, 'SQL');
          dbQueriesTotal?.inc({ query_type: deriveQueryType(query) });
        },
      }
    : undefined;

export function getDb(): DbInstance {
  if (!_db) {
    const url = process.env['DATABASE_URL'];
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    _client = postgres(url, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
      ssl: process.env['NODE_ENV'] === 'production' ? 'require' : false,
      // Prevent runaway queries from exhausting the pool
      connection: { statement_timeout: 30_000 },
    });
    _db = drizzle(_client, { schema, logger: devQueryLogger });
  }
  return _db;
}
