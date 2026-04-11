import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { DB_DIR } from "../src/db.ts";
import { rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DB_PATH = join(DB_DIR, "agent-test.db");

describe("Phase 1 - Database Migration", () => {
  let db: Database;

  beforeAll(() => {
    mkdirSync(DB_DIR, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(TEST_DB_PATH);
    } catch {
    }
  });

  it("migrate() adds agent_id and title columns to existing sessions table", () => {
    db = new Database(TEST_DB_PATH);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         TEXT    PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   TEXT    NOT NULL REFERENCES sessions(id),
        seq          INTEGER NOT NULL,
        role         TEXT    NOT NULL,
        content      TEXT,
        tool_calls   TEXT,
        tool_call_id TEXT,
        created_at   INTEGER NOT NULL,
        UNIQUE(session_id, seq)
      );

      CREATE TABLE IF NOT EXISTS memory (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        content    TEXT    NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    const tableInfo = db.query("PRAGMA table_info(sessions)").all() as { name: string }[];
    const hasAgentId = tableInfo.some(col => col.name === "agent_id");
    const hasTitle = tableInfo.some(col => col.name === "title");

    expect(hasAgentId).toBe(false);
    expect(hasTitle).toBe(false);

    db.exec("ALTER TABLE sessions ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'coding'");
    db.exec("ALTER TABLE sessions ADD COLUMN title TEXT");

    const updatedTableInfo = db.query("PRAGMA table_info(sessions)").all() as { name: string }[];
    const updatedHasAgentId = updatedTableInfo.some(col => col.name === "agent_id");
    const updatedHasTitle = updatedTableInfo.some(col => col.name === "title");

    expect(updatedHasAgentId).toBe(true);
    expect(updatedHasTitle).toBe(true);

    db.close();
  });

  it("new database includes agent_id and title columns in sessions table", () => {
    const db2 = new Database(TEST_DB_PATH);
    
    db2.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         TEXT    PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        agent_id   TEXT    NOT NULL DEFAULT 'coding',
        title      TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   TEXT    NOT NULL REFERENCES sessions(id),
        seq          INTEGER NOT NULL,
        role         TEXT    NOT NULL,
        content      TEXT,
        tool_calls   TEXT,
        tool_call_id TEXT,
        created_at   INTEGER NOT NULL,
        UNIQUE(session_id, seq)
      );

      CREATE TABLE IF NOT EXISTS memory (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        content    TEXT    NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    const tableInfo = db2.query("PRAGMA table_info(sessions)").all() as { name: string }[];
    const hasAgentId = tableInfo.some(col => col.name === "agent_id");
    const hasTitle = tableInfo.some(col => col.name === "title");

    expect(hasAgentId).toBe(true);
    expect(hasTitle).toBe(true);

    db2.close();
  });
});
