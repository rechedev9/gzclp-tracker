import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _client: postgres.Sql | undefined;
let _db: DbInstance | undefined;

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
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}
