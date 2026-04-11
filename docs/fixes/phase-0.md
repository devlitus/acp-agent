# Phase 0 — Issues & Fixes

## Issue #1: `audience: "mixed"` causes TypeScript error

**File:** `src/agents/data.ts`, `src/agents/types.ts`

**Problem:**
`dataAgent` declared `audience: "mixed"` but `AgentConfig` only allowed `"all" | "technical"`.
TypeScript rejected the value silently during development (no compile step in the hot path),
so it went unnoticed until a full `tsc --noEmit` check was run.

**Fix:**
Added `"mixed"` to the union type in `src/agents/types.ts`:
```ts
audience: "all" | "technical" | "mixed";
```

**Lesson:**
Run `bunx tsc --noEmit` as part of the review checklist at the end of each phase,
not just `bun test`. Tests pass even when types are wrong.

---

## Issue #2: `research.md` promised non-existent tools

**File:** `src/agents/prompts/research.md`

**Problem:**
The system prompt said "You can search the web, fetch URLs" but `web-search` and
`fetch-url` are Phase 6 tools. The agent would tell users it could do things it cannot,
leading to confusing failures.

**Fix:**
Rewrote the prompt to describe only current capabilities (`write_file`, `save_memory`,
`recall_memory`). Web search will be re-added to the prompt in Phase 6 alongside the tools.

**Lesson:**
System prompts must stay in sync with the tool list in the agent config.
When adding tools in future phases, update both the `AgentConfig.tools` array
and the corresponding `prompts/*.md` file in the same commit.

---

## Issue #3: Missing tests for `AgentRegistry` and `ToolRegistry`

**Files:** `src/agents/registry.test.ts`, `src/tools/registry.test.ts` (both created)

**Problem:**
Phase 0 defined `AgentRegistry.validate()` and `ToolRegistry.forAgent()` as the two
critical new behaviours, but no tests existed. The roadmap listed them as deliverables
and they were skipped.

**Fix:**
Created both test files covering:
- `AgentRegistry`: get, unknown ID throws, getAll, chaining, getSystemPrompt, validate pass/fail
- `ToolRegistry`: forAgent subset, forAgent with unknown name, empty list, execute unknown tool, kind fallback

**Lesson:**
Tests for registries and validators are fast to write and catch the most common
integration mistakes (tool name typos, missing registrations). Write them in the same
PR as the feature, not after.

---

## Issue #4: Array index access without null check (pre-existing)

**File:** `tests/tools.test.ts` (line 14)

**Problem:**
`filtered.definitions[0].name` — accessing index `[0]` directly fails TypeScript's
strict mode because the array element is typed as `T | undefined`.
This was a pre-existing issue in the test file, surfaced when running `tsc --noEmit`.

**Fix:**
Changed to `filtered.definitions[0]?.name` to satisfy strict null checks.

**Lesson:**
`bun test` does not run type checking. Always pair it with `tsc --noEmit`
before marking a phase as complete.

---

## Design Observation: `AgentRegistry.validate()` imports global `toolRegistry`

**File:** `src/agents/registry.ts`

**Status:** Noted, not changed (acceptable for now)

**Detail:**
`validate()` directly imports the global `toolRegistry` singleton from `../tools/index.ts`.
This couples `AgentRegistry` to a specific `ToolRegistry` instance, making it harder to
test in isolation or to validate against a different registry.

**Future improvement (Phase 1 or later):**
Change the signature to `validate(toolRegistry: ToolRegistry): void` and pass it
from `src/agents/index.ts`. This removes the hidden dependency and makes the
validation reusable.

---

## End-of-phase checklist (to reuse in future phases)

- [ ] `bun test` — all tests pass
- [ ] `bunx tsc --noEmit` — zero type errors
- [ ] System prompts match the tool list in each agent config
- [ ] No hardcoded values that belong in config or agent files
- [ ] New behaviours have at least one test covering the happy path and one error path
