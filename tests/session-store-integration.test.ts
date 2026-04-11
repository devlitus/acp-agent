import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { SessionStore } from "../src/agent/session-store.ts";
import { db, DB_PATH, DB_DIR } from "../src/db.ts";
import { rmSync, existsSync } from "node:fs";

describe("Phase 1 - SessionStore Integration", () => {
  const testSessions: string[] = [];

  beforeEach(() => {
    db.exec("DELETE FROM sessions WHERE id LIKE 'test-session-%'");
    db.exec("DELETE FROM messages WHERE session_id LIKE 'test-session-%'");
  });

  afterEach(() => {
    for (const sessionId of testSessions) {
      db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
      db.run("DELETE FROM messages WHERE session_id = ?", [sessionId]);
    }
    testSessions.length = 0;
  });

  it("create() stores agent_id correctly", () => {
    const store = new SessionStore();
    const sessionId = `test-session-${Date.now()}`;
    const agentId = "coding";

    store.create(sessionId, agentId);
    testSessions.push(sessionId);

    const session = db.query("SELECT agent_id FROM sessions WHERE id = ?").get(sessionId) as { agent_id: string } | undefined;
    expect(session?.agent_id).toBe(agentId);
  });

  it("create() uses 'coding' as default agent_id", () => {
    const store = new SessionStore();
    const sessionId = `test-session-${Date.now()}`;

    store.create(sessionId);
    testSessions.push(sessionId);

    const session = db.query("SELECT agent_id FROM sessions WHERE id = ?").get(sessionId) as { agent_id: string } | undefined;
    expect(session?.agent_id).toBe("coding");
  });

  it("setTitle() updates session title correctly", () => {
    const store = new SessionStore();
    const sessionId = `test-session-${Date.now()}`;
    store.create(sessionId);
    testSessions.push(sessionId);

    store.setTitle(sessionId, "Test Session Title");

    const session = db.query("SELECT title FROM sessions WHERE id = ?").get(sessionId) as { title: string | null } | undefined;
    expect(session?.title).toBe("Test Session Title");
  });

  it("setTitle() truncates long titles", () => {
    const store = new SessionStore();
    const sessionId = `test-session-${Date.now()}`;
    store.create(sessionId);
    testSessions.push(sessionId);

    const longTitle = "This is a very long title that exceeds the expected length for a session title and should be handled properly";
    store.setTitle(sessionId, longTitle);

    const session = db.query("SELECT title FROM sessions WHERE id = ?").get(sessionId) as { title: string | null } | undefined;
    expect(session?.title).toBe(longTitle);
  });

  it("listByAgent() returns only sessions for the given agent", () => {
    const store = new SessionStore();

    const session1 = `test-session-${Date.now()}-1`;
    const session2 = `test-session-${Date.now()}-2`;
    const session3 = `test-session-${Date.now()}-3`;

    store.create(session1, "coding");
    store.create(session2, "writing");
    store.create(session3, "coding");

    testSessions.push(session1, session2, session3);

    const codingSessions = store.listByAgent("coding");
    const writingSessions = store.listByAgent("writing");

    expect(codingSessions).toHaveLength(2);
    expect(codingSessions.map(s => s.id)).toContain(session1);
    expect(codingSessions.map(s => s.id)).toContain(session3);

    expect(writingSessions).toHaveLength(1);
    expect(writingSessions[0]?.id).toBe(session2);
  });

  it("listByAgent() returns sessions in descending updated_at order", () => {
    const store = new SessionStore();

    const baseTime = Date.now();
    const session1 = `test-session-001`;
    const session2 = `test-session-002`;
    const session3 = `test-session-003`;

    store.create(session1, "coding");
    db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [baseTime, session1]);

    store.create(session2, "coding");
    db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [baseTime + 1000, session2]);

    store.create(session3, "coding");
    db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [baseTime + 2000, session3]);

    testSessions.push(session1, session2, session3);

    const sessions = store.listByAgent("coding");
    expect(sessions).toHaveLength(3);
    
    const sessionIds = sessions.map(s => s.id);
    expect(sessionIds[0]).toBe(session3);
    expect(sessionIds[1]).toBe(session2);
    expect(sessionIds[2]).toBe(session1);
  });

  it("listByAgent() returns empty array for agent with no sessions", () => {
    const store = new SessionStore();
    const sessions = store.listByAgent("nonexistent-agent");
    expect(sessions).toHaveLength(0);
  });

  it("listByAgent() returns sessions with title, created_at, and updated_at", () => {
    const store = new SessionStore();
    const sessionId = `test-session-${Date.now()}`;
    store.create(sessionId, "coding");
    store.setTitle(sessionId, "Test Title");
    testSessions.push(sessionId);

    const sessions = store.listByAgent("coding");
    const testSession = sessions.find(s => s.id === sessionId);

    expect(testSession).toBeDefined();
    expect(testSession?.title).toBe("Test Title");
    expect(typeof testSession?.created_at).toBe("number");
    expect(typeof testSession?.updated_at).toBe("number");
  });
});
