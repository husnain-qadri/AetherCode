import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const dbPromise = open({
  filename: `${__dirname}/app.db`,
  driver: sqlite3.Database
}).then(async db => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT CHECK (role IN ('editor','reviewer','admin')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS participants (
      session_id TEXT,
      user_id TEXT,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT,
      schema TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS recordings (
      session_id TEXT,
      s3_key TEXT,
      recorded_at TIMESTAMP,
      PRIMARY KEY (session_id, s3_key)
    );
  `);
  return db;
});
