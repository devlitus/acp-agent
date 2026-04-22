import type { Database, Statement } from "bun:sqlite";
import { db as globalDb } from "../db.ts";

export type Memory = {
  id: number;
  content: string;
  created_at: number;
};

const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "al", "a", "en", "por", "para", "con", "sin",
  "que", "se", "su", "es", "lo", "no", "si", "mi", "me",
  "the", "a", "an", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "shall", "should", "may", "might", "can", "could",
  "of", "in", "to", "for", "with", "on", "at", "from", "by",
  "about", "as", "into", "through", "during", "before", "after",
  "and", "but", "or", "not", "no", "so", "if", "that", "it",
  "this", "these", "those", "i", "you", "he", "she", "we",
  "they", "my", "your", "his", "her", "its", "our", "their",
]);

export function normalize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class MemoryStore {
  private db: Database;
  private insertStmt: Statement;
  private insertWithSourceStmt: Statement;
  private allStmt: Statement;
  private keywordStmt: Statement;
  private recentStmt: Statement;
  private existsStmt: Statement;
  private allContentStmt: Statement;
  private countStmt: Statement;
  private normalizedCache = new Map<string, Set<string>>();
  private cacheDirty = true;

  constructor(db: Database = globalDb) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      "INSERT INTO memory (content, created_at) VALUES (?, ?)",
    );
    this.insertWithSourceStmt = this.db.prepare(
      "INSERT INTO memory (content, created_at, source) VALUES (?, ?, ?)",
    );
    this.allStmt = this.db.prepare(
      "SELECT id, content, created_at FROM memory ORDER BY created_at DESC",
    );
    this.keywordStmt = this.db.prepare(
      "SELECT id, content, created_at FROM memory WHERE content LIKE ? ORDER BY created_at DESC",
    );
    this.recentStmt = this.db.prepare(
      "SELECT id, content, created_at FROM memory ORDER BY created_at DESC LIMIT ?",
    );
    this.existsStmt = this.db.prepare(
      "SELECT 1 FROM memory WHERE content = ?",
    );
    this.allContentStmt = this.db.prepare(
      "SELECT content FROM memory",
    );
    this.countStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM memory",
    );
  }

  save(content: string, source?: string): void {
    const now = Date.now();
    if (source) {
      this.insertWithSourceStmt.run(content, now, source);
    } else {
      this.insertStmt.run(content, now);
    }
    this.cacheDirty = true;
  }

  recall(keyword?: string): Memory[] {
    const stmt = keyword ? this.keywordStmt : this.allStmt;
    const rows = keyword ? stmt.all(`%${keyword}%`) : stmt.all();
    return rows as Memory[];
  }

  recallRecent(limit: number): Memory[] {
    return this.recentStmt.all(limit) as Memory[];
  }

  exists(content: string): boolean {
    return this.existsStmt.get(content) !== null;
  }

  // TODO: Phase 3 will replace this with cosine similarity via embeddings
  hasSimilar(content: string, threshold: number = 0.7): boolean {
    const normalized = normalize(content);
    if (normalized.size === 0) return false;

    if (this.existsStmt.get(content)) return true;

    this.ensureCache();
    for (const existing of this.normalizedCache.values()) {
      if (jaccardSimilarity(normalized, existing) >= threshold) return true;
    }
    return false;
  }

  count(): number {
    const row = this.countStmt.get() as { count: number };
    return row.count;
  }

  private ensureCache(): void {
    if (!this.cacheDirty) return;
    this.normalizedCache.clear();
    const rows = this.allContentStmt.all() as { content: string }[];
    for (const row of rows) {
      this.normalizedCache.set(row.content, normalize(row.content));
    }
    this.cacheDirty = false;
  }
}

export const memoryStore = new MemoryStore();
