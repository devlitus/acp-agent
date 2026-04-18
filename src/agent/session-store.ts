import type { Database, Statement } from "bun:sqlite";
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
  private insertMsgStmt: Statement;
  private loadMessagesStmt: Statement;
  private getSessionStmt: Statement;
  private getDisplayMessagesStmt: Statement;
  private listRecentStmt: Statement;
  private listByAgentStmt: Statement;
  private createSessionStmt: Statement;
  private updateSessionStmt: Statement;
  private setTitleStmt: Statement;
  private deleteMessagesStmt: Statement;
  private deleteSessionStmt: Statement;
  private saveTransaction: ReturnType<Database["transaction"]>;
  private deleteTransaction: ReturnType<Database["transaction"]>;

  constructor(db: Database = globalDb) {
    this.db = db;
    this.insertMsgStmt = this.db.prepare(
      `INSERT OR IGNORE INTO messages (session_id, seq, role, content, tool_calls, tool_call_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    this.loadMessagesStmt = this.db.prepare(
      "SELECT role, content, tool_calls, tool_call_id FROM messages WHERE session_id = ? ORDER BY seq",
    );
    this.getSessionStmt = this.db.prepare(
      "SELECT id FROM sessions WHERE id = ?",
    );
    this.getDisplayMessagesStmt = this.db.prepare(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY seq",
    );
    this.listRecentStmt = this.db.prepare(
      "SELECT id, agent_id, title, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?",
    );
    this.listByAgentStmt = this.db.prepare(
      "SELECT id, title, created_at, updated_at FROM sessions WHERE agent_id = ? ORDER BY updated_at DESC LIMIT 50",
    );
    this.createSessionStmt = this.db.prepare(
      "INSERT INTO sessions (id, created_at, updated_at, agent_id) VALUES (?, ?, ?, ?)",
    );
    this.updateSessionStmt = this.db.prepare(
      "UPDATE sessions SET updated_at = ? WHERE id = ?",
    );
    this.setTitleStmt = this.db.prepare(
      "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
    );
    this.deleteMessagesStmt = this.db.prepare("DELETE FROM messages WHERE session_id = ?");
    this.deleteSessionStmt = this.db.prepare("DELETE FROM sessions WHERE id = ?");
    this.saveTransaction = this.db.transaction((sessionId: string, now: number, msgs: Message[]) => {
      this.updateSessionStmt.run(now, sessionId);
      msgs.forEach((msg, seq) => {
        this.insertMsgStmt.run(
          sessionId,
          seq,
          msg.role,
          msg.content ?? null,
          msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
          msg.tool_call_id ?? null,
          now,
        );
      });
    });
    this.deleteTransaction = this.db.transaction((sessionId: string) => {
      this.deleteMessagesStmt.run(sessionId);
      this.deleteSessionStmt.run(sessionId);
    });
  }

  create(sessionId: string, agentId: string = "coding"): void {
    const now = Date.now();
    this.createSessionStmt.run(sessionId, now, now, agentId);
  }

  load(sessionId: string): Message[] | null {
    const session = this.getSessionStmt.get(sessionId);
    if (!session) return null;

    const rows = this.loadMessagesStmt.all(sessionId) as MessageRow[];

    return rows.map((r) => {
      const msg: Message = { role: r.role as Message["role"], content: r.content };
      if (r.tool_calls) msg.tool_calls = JSON.parse(r.tool_calls);
      if (r.tool_call_id) msg.tool_call_id = r.tool_call_id;
      return msg;
    });
  }

  save(sessionId: string, history: Message[]): void {
    const now = Date.now();
    this.saveTransaction(sessionId, now, history);
  }

  setTitle(sessionId: string, title: string): void {
    const now = Date.now();
    this.setTitleStmt.run(title, now, sessionId);
  }

  listByAgent(agentId: string): Array<{ id: string; title: string | null; created_at: number; updated_at: number }> {
    return this.listByAgentStmt.all(agentId) as Array<{ id: string; title: string | null; created_at: number; updated_at: number }>;
  }

  listRecent(limit: number = 10): Array<{ id: string; agent_id: string; title: string | null; updated_at: number }> {
    return this.listRecentStmt.all(limit) as Array<{ id: string; agent_id: string; title: string | null; updated_at: number }>;
  }

  getDisplayMessages(sessionId: string): DisplayMessage[] | null {
    const session = this.getSessionStmt.get(sessionId);
    if (!session) return null;

    const rows = this.getDisplayMessagesStmt.all(sessionId) as { role: string; content: string | null }[];

    return rows
      .filter((r) => (r.role === "user" || r.role === "assistant") && r.content !== null)
      .map((r) => ({
        role: r.role === "assistant" ? "agent" : "user",
        text: r.content!,
      }));
  }

  delete(sessionId: string): boolean {
    const session = this.getSessionStmt.get(sessionId);
    if (!session) return false;

    this.deleteTransaction(sessionId);
    return true;
  }
}

export const sessionStore = new SessionStore();
