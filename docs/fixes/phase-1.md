# Phase 1 — Issues & Fixes

## Issue #1 (BUG): Migration guard crashes on old databases

**File:** `src/db.ts`

**Problem:**
`hasAgentId` and `hasTitle` are captured from `tableInfo` *before* the table rebuild runs.
If the old schema has a `history NOT NULL` column (the rebuild path), the rebuilt table
already contains `agent_id` and `title`. The code then reaches `if (!hasAgentId)` which is
`true` (old value) and executes `ALTER TABLE sessions ADD COLUMN agent_id` — but that column
now exists, causing a SQLite "duplicate column" error.

Only affects existing databases that still carry the old `history` column. New databases
created from scratch with `CREATE TABLE IF NOT EXISTS` are unaffected.

**Fix:**
Add an early return after the rebuild block, or re-query `tableInfo` after it.
The simplest safe fix is to return early:

```ts
if (historyCol && historyCol.notnull === 1) {
  db.exec("CREATE TABLE sessions_new (...)");
  db.exec("INSERT INTO sessions_new ...");
  db.exec("DROP TABLE sessions");
  db.exec("ALTER TABLE sessions_new RENAME TO sessions");
  return; // columns already present in rebuilt table
}

if (!hasAgentId) { ... }
if (!hasTitle)   { ... }
```

---

## Issue #2 (BUG): `sessionStore.create()` never receives the agent ID

**File:** `src/agent/agent.ts`, line 29

**Problem:**
`sessionStore.create(sessionId)` is called without an `agentId` argument.
`SessionStore.create()` defaults to `"coding"`, so *every* session from *every* agent
is stored with `agent_id = 'coding'`. `listByAgent("writing")` would return an empty list
even when the writing agent has active sessions. The entire purpose of Phase 1 is broken
at the point of session creation.

The `OllamaAgent` constructor never receives the agent ID; there is no way for `newSession()`
to know which agent is running.

**Fix:**
Add `agentId` to the `OllamaAgent` constructor and thread it through from `src/agent/index.ts`:

```ts
// src/agent/agent.ts
constructor(
  private connection: acp.AgentSideConnection,
  private llm: LLMProvider,
  private systemPrompt: string,
  private toolRegistry: ToolRegistry,
  private agentId: string,         // ADD
) {}

async newSession(...): Promise<acp.NewSessionResponse> {
  const sessionId = crypto.randomUUID();
  sessionStore.create(sessionId, this.agentId);  // PASS agentId
  ...
}
```

```ts
// src/agent/index.ts  (already imports AGENT_ID and agentConfig)
new acp.AgentSideConnection(
  (conn) => new OllamaAgent(conn, llm, systemPrompt, tools, AGENT_ID),  // ADD
  stream,
);
```

---

## Issue #3 (MISSING): No tests for `SessionStore`

**Problem:**
Phase 1 required two tests:
- `SessionStore.listByAgent()` returns only sessions for the given agent
- `SessionStore.setTitle()` updates correctly

No `session-store.test.ts` file exists. `bun test` passes only because it only runs
`registry.test.ts` files from Phase 0.

**Fix:**
Create `src/agent/session-store.test.ts`. Use an in-memory SQLite database to keep
tests fast and side-effect-free (pass `:memory:` to `new Database()`). Inject the db
instance rather than using the global singleton, or temporarily swap the module — whichever
pattern fits the existing test style.

Minimum coverage:
```ts
test("listByAgent returns only matching agent sessions", () => { ... });
test("listByAgent returns empty for unknown agentId", () => { ... });
test("setTitle updates the title field", () => { ... });
test("setTitle updates updated_at", () => { ... });
```

---

## End-of-phase checklist (reused from phase-0)

- [ ] `bun test` — all tests pass
- [ ] `bunx tsc --noEmit` — zero type errors
- [ ] `sessionStore.create()` callers pass the correct `agentId`
- [ ] Migration is safe on both fresh and pre-existing databases
- [ ] Phase deliverables have at least one happy-path and one error-path test
