import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { MemoryStore, normalize, jaccardSimilarity } from "./memory-store.ts";

function makeStore(): MemoryStore {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE memory (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      category   TEXT,
      source     TEXT
    );
    CREATE INDEX idx_memory_created_at ON memory(created_at DESC);
  `);
  return new MemoryStore(db);
}

describe("normalize", () => {
  test("lowercases and removes punctuation", () => {
    const result = normalize("Hello, World!");
    expect(result).toEqual(new Set(["hello", "world"]));
  });

  test("removes Spanish stop words", () => {
    const result = normalize("El usuario prefiere el modo oscuro");
    expect(result.has("el")).toBe(false);
    expect(result.has("usuario")).toBe(true);
    expect(result.has("prefiere")).toBe(true);
    expect(result.has("modo")).toBe(true);
    expect(result.has("oscuro")).toBe(true);
  });

  test("removes English stop words", () => {
    const result = normalize("The user prefers the dark mode");
    expect(result.has("the")).toBe(false);
    expect(result.has("user")).toBe(true);
    expect(result.has("prefers")).toBe(true);
    expect(result.has("dark")).toBe(true);
    expect(result.has("mode")).toBe(true);
  });

  test("filters words shorter than 2 characters", () => {
    const result = normalize("a b cd");
    expect(result.has("a")).toBe(false);
    expect(result.has("b")).toBe(false);
    expect(result.has("cd")).toBe(true);
  });

  test("returns empty set for stop-words-only input", () => {
    const result = normalize("the a an is");
    expect(result.size).toBe(0);
  });

  test("handles unicode letters", () => {
    const result = normalize("El niño quiere jugar");
    expect(result.has("niño")).toBe(true);
    expect(result.has("quiere")).toBe(true);
    expect(result.has("jugar")).toBe(true);
  });
});

describe("jaccardSimilarity", () => {
  test("returns 1 for identical sets", () => {
    const a = new Set(["hello", "world"]);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  test("returns 0 for disjoint sets", () => {
    const a = new Set(["hello"]);
    const b = new Set(["world"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  test("returns 0 for empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
    expect(jaccardSimilarity(new Set(["hello"]), new Set())).toBe(0);
  });

  test("computes partial overlap correctly", () => {
    const a = new Set(["hello", "world", "foo"]);
    const b = new Set(["hello", "world", "bar"]);
    const result = jaccardSimilarity(a, b);
    expect(result).toBeCloseTo(2 / 4);
  });
});

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  describe("save()", () => {
    test("saves a memory without source", () => {
      store.save("test fact");
      const memories = store.recall();
      expect(memories).toHaveLength(1);
      expect(memories[0]!.content).toBe("test fact");
    });

    test("saves a memory with source", () => {
      store.save("auto fact", "auto");
      const memories = store.recall();
      expect(memories).toHaveLength(1);
    });
  });

  describe("recall()", () => {
    test("returns all memories", () => {
      store.save("first");
      store.save("second");
      store.save("third");

      const memories = store.recall();
      expect(memories).toHaveLength(3);
      const contents = memories.map(m => m.content);
      expect(contents).toContain("first");
      expect(contents).toContain("second");
      expect(contents).toContain("third");
    });

    test("filters by keyword", () => {
      store.save("TypeScript is great");
      store.save("Bun is fast");
      store.save("TypeScript with Bun");

      const memories = store.recall("TypeScript");
      expect(memories).toHaveLength(2);
    });

    test("returns empty array when no memories", () => {
      expect(store.recall()).toEqual([]);
    });

    test("returns empty array when keyword has no matches", () => {
      store.save("hello world");
      expect(store.recall("nonexistent")).toEqual([]);
    });
  });

  describe("recallRecent()", () => {
    test("limits results to the given count", () => {
      for (let i = 0; i < 10; i++) {
        store.save(`fact ${i}`);
      }

      const memories = store.recallRecent(3);
      expect(memories).toHaveLength(3);
    });

    test("returns fewer if not enough memories", () => {
      store.save("only one");
      const memories = store.recallRecent(5);
      expect(memories).toHaveLength(1);
    });
  });

  describe("exists()", () => {
    test("returns true for exact match", () => {
      store.save("exact fact");
      expect(store.exists("exact fact")).toBe(true);
    });

    test("returns false for non-existent memory", () => {
      expect(store.exists("no such fact")).toBe(false);
    });

    test("is case-sensitive", () => {
      store.save("CaseSensitive");
      expect(store.exists("casesensitive")).toBe(false);
    });
  });

  describe("hasSimilar()", () => {
    test("returns true for exact duplicate", () => {
      store.save("user prefers dark mode");
      expect(store.hasSimilar("user prefers dark mode")).toBe(true);
    });

    test("returns true for highly similar content", () => {
      store.save("user prefers dark mode");
      expect(store.hasSimilar("the user prefers dark mode")).toBe(true);
    });

    test("returns false for dissimilar content", () => {
      store.save("user prefers dark mode");
      expect(store.hasSimilar("project uses TypeScript")).toBe(false);
    });

    test("returns false when no memories exist", () => {
      expect(store.hasSimilar("anything")).toBe(false);
    });

    test("returns false for empty-normalized input", () => {
      store.save("something useful");
      expect(store.hasSimilar("el la los")).toBe(false);
    });

    test("detects similarity after saving new memories", () => {
      store.save("first fact");
      store.save("second fact");
      expect(store.hasSimilar("the first fact")).toBe(true);
    });
  });

  describe("count()", () => {
    test("returns 0 when empty", () => {
      expect(store.count()).toBe(0);
    });

    test("returns the total number of memories", () => {
      store.save("one");
      store.save("two");
      store.save("three");
      expect(store.count()).toBe(3);
    });
  });
});
