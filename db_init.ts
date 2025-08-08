import { DatabaseSync } from "node:sqlite";
import { loadEnv } from "./env.ts";

// Load environment variables
await loadEnv();

const databasePath = Deno.env.get("DATABASE_PATH") || "birthday_book.db";
const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS birthday (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    name TEXT NOT NULL,
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (accountId) REFERENCES account(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_code (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    code TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (accountId) REFERENCES account(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sharing_link (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (accountId) REFERENCES account(id) ON DELETE CASCADE
  );
`);

db.close();

console.log("Database initialized: birthday_book.db"); 