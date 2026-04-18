import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "passkey-demo.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key BLOB NOT NULL,
      counter INTEGER NOT NULL,
      transports TEXT,
      device_type TEXT,
      backed_up INTEGER NOT NULL,
      nickname TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_credentials_user_id
      ON credentials(user_id);
  `);

  const userCols = db
    .prepare("PRAGMA table_info(users)")
    .all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === "display_name")) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
  }

  _db = db;
  return db;
}

export type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: number;
};

export type CredentialRow = {
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: number;
  transports: string | null;
  device_type: string | null;
  backed_up: number;
  nickname: string | null;
  created_at: number;
};
