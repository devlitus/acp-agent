import type { Message } from "../llm/types.ts";
import { db } from "../db.ts";

type MessageRow = {
  role: string;
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
};

export class SessionStore {
  create(sessionId: string): void {
    const now = Date.now();
    db.run("INSERT INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)", [sessionId, now, now]);
  }

  load(sessionId: string): Message[] | null {
    const session = db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!session) return null;

    const rows = db.query(
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
    db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [now, sessionId]);

    history.forEach((msg, seq) => {
      db.run(
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
}

export const sessionStore = new SessionStore();
