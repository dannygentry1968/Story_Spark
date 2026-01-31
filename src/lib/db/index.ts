import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

// Ensure data directory exists
const dbPath = env.DATABASE_URL?.replace('file:', '') || './data/storyspark.db';

// Create the database connection
let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

export function getDb() {
  if (!db) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    mkdir(dir, { recursive: true }).catch(() => {});

    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    db = drizzle(sqlite, { schema });
  }
  return db;
}

export function closeDb() {
  if (sqlite) {
    sqlite.close();
  }
}

export { schema };
export * from './schema';
