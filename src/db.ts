import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export const DB_DIR = join(homedir(), ".acp-agent");
export const DB_PATH = join(DB_DIR, "agent.db");

function migrate(db: Database): void {
  const tableInfo = db.query("PRAGMA table_info(sessions)").all() as { name: string; notnull: number }[];
  const hasAgentId = tableInfo.some(col => col.name === "agent_id");
  const hasTitle = tableInfo.some(col => col.name === "title");
  const historyCol = tableInfo.find(col => col.name === "history");

  if (historyCol && historyCol.notnull === 1) {
    db.exec("CREATE TABLE sessions_new (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, agent_id TEXT NOT NULL DEFAULT 'coding', title TEXT)");
    db.exec("INSERT INTO sessions_new (id, created_at, updated_at) SELECT id, created_at, updated_at FROM sessions");
    db.exec("DROP TABLE sessions");
    db.exec("ALTER TABLE sessions_new RENAME TO sessions");
    return;
  }

  if (!hasAgentId) {
    db.exec("ALTER TABLE sessions ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'coding'");
  }

  if (!hasTitle) {
    db.exec("ALTER TABLE sessions ADD COLUMN title TEXT");
  }
}

function openDb(): Database {
  mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_sessions_agent_id_updated ON sessions(agent_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_created_at         ON memory(created_at DESC);
  `);
  migrate(db);
  return db;
}

export const db = openDb();
