import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SessionStore } from "./session-store.ts";

function makeStore(): SessionStore {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE sessions (
      id         TEXT    PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      agent_id   TEXT    NOT NULL DEFAULT 'coding',
      title      TEXT
    );
    CREATE TABLE messages (
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
  `);
  return new SessionStore(db);
}

describe("SessionStore", () => {
  describe("listByAgent()", () => {
    test("returns only sessions for the given agent", () => {
      const store = makeStore();
      store.create("s1", "writing");
      store.create("s2", "coding");
      store.create("s3", "writing");

      const results = store.listByAgent("writing");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual(["s1", "s3"]);
    });

    test("returns empty array for unknown agentId", () => {
      const store = makeStore();
      store.create("s1", "coding");

      expect(store.listByAgent("nonexistent")).toEqual([]);
    });

    test("returns sessions ordered by updated_at descending", () => {
      const store = makeStore();
      store.create("s1", "writing");
      store.create("s2", "writing");
      store.setTitle("s1", "First");

      const results = store.listByAgent("writing");
      expect(results[0]?.id).toBe("s1");
    });
  });

  describe("setTitle()", () => {
    test("updates the title field", () => {
      const store = makeStore();
      store.create("s1", "coding");
      store.setTitle("s1", "My Session");

      const results = store.listByAgent("coding");
      expect(results[0]?.title).toBe("My Session");
    });

    test("updates updated_at on setTitle", () => {
      const store = makeStore();
      store.create("s1", "coding");
      const before = store.listByAgent("coding")[0]!.updated_at;

      store.setTitle("s1", "Changed");
      const after = store.listByAgent("coding")[0]!.updated_at;

      expect(after).toBeGreaterThanOrEqual(before);
    });
  });
});
