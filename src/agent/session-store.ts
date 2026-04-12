import type { Database } from "bun:sqlite";
import type { Message } from "../llm/types.ts";
import { db as globalDb } from "../db.ts";

type MessageRow = {
  role: string;
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
};

export type DisplayMessage = {
  role: "user" | "agent";
  text: string;
};

export class SessionStore {
  private db: Database;

  constructor(db: Database = globalDb) {
    this.db = db;
  }

  create(sessionId: string, agentId: string = "coding"): void {
    const now = Date.now();
    this.db.run("INSERT INTO sessions (id, created_at, updated_at, agent_id) VALUES (?, ?, ?, ?)", [sessionId, now, now, agentId]);
  }

  load(sessionId: string): Message[] | null {
    const session = this.db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!session) return null;

    const rows = this.db.query(
      "SELECT role, content, tool_calls, tool_call_id FROM messages WHERE session_id = ? ORDER BY seq",
    ).all(sessionId) as MessageRow[];

    return rows.map((r) => {
      const msg: Message = { role: r.role as Message["role"], content: r.content };
      if (r.tool_calls) msg.tool_calls = JSON.parse(r.tool_calls);
      if (r.tool_call_id) msg.tool_call_id = r.tool_call_id;
      return msg;
    });
  }

  save(sessionId: string, history: Message[]): void {
    const now = Date.now();
    this.db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [now, sessionId]);

    history.forEach((msg, seq) => {
      this.db.run(
        `INSERT OR IGNORE INTO messages (session_id, seq, role, content, tool_calls, tool_call_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          seq,
          msg.role,
          msg.content ?? null,
          msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
          msg.tool_call_id ?? null,
          now,
        ],
      );
    });
  }

  setTitle(sessionId: string, title: string): void {
    const now = Date.now();
    this.db.run("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", [title, now, sessionId]);
  }

  listByAgent(agentId: string): Array<{ id: string; title: string | null; created_at: number; updated_at: number }> {
    return this.db.query(
      "SELECT id, title, created_at, updated_at FROM sessions WHERE agent_id = ? ORDER BY updated_at DESC"
    ).all(agentId) as Array<{ id: string; title: string | null; created_at: number; updated_at: number }>;
  }

  getDisplayMessages(sessionId: string): DisplayMessage[] | null {
    const session = this.db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!session) return null;

    const rows = this.db.query(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY seq"
    ).all(sessionId) as { role: string; content: string | null }[];

    return rows
      .filter((r) => (r.role === "user" || r.role === "assistant") && r.content !== null)
      .map((r) => ({
        role: r.role === "assistant" ? "agent" : "user",
        text: r.content!,
      }));
  }

  delete(sessionId: string): boolean {
    const session = this.db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!session) return false;

    this.db.run("DELETE FROM messages WHERE session_id = ?", [sessionId]);
    this.db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return true;
  }
}

export const sessionStore = new SessionStore();
