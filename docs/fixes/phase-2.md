# Phase 2 — Issues & Fixes

## Issue #1 (BUG — FIXED): Client messages never reach the bridge

**Files:** `src/web/bridge.ts`, `src/web/server.ts`

**Problem:**
`ACPWebSocketBridge` attached listeners via the DOM `WebSocket` API:

```ts
ws.addEventListener("message", ...);  // does not exist on Bun ServerWebSocket
ws.addEventListener("close", ...);
```

`Bun.serve()` passes a `Bun.ServerWebSocket<T>`, which has no `addEventListener`. All
incoming client messages were silently discarded. The centralized `websocket.message`
handler was also empty, so there was no fallback path.

Additionally, the bridge was a local variable inside `open()` — lost immediately after the
callback returned — so even a correct centralized handler had no way to reach it.

**Fix applied:**
- `ACPWebSocketBridge` constructor now takes `Bun.ServerWebSocket<BridgeData>`.
- `handleClientMessage` and `cleanup` are public methods.
- `ws.data.bridge` stores the bridge reference during `open()`.
- The centralized `websocket.message` handler routes to `ws.data.bridge?.handleClientMessage(...)`.
- The centralized `websocket.close` handler routes to `ws.data.bridge?.cleanup()`.
- `BridgeData` is exported from `bridge.ts`; `server.ts` uses `Bun.serve<BridgeData>` so
  `ws.data` is fully typed with no casts.

---

## Issue #2 (BUG — FIXED): Permission response lookup used the wrong key

**File:** `src/web/bridge.ts`

**Problem:**
`pendingPermissions` was keyed by `toolCallId`:

```ts
this.pendingPermissions.set(toolCallId, permission);
```

But `handlePermissionResponse` looked up by `optionId`:

```ts
const pending = this.pendingPermissions.get(optionId);  // always undefined
```

The `Promise` in `requestPermission` never resolved — every permission-gated tool call
hung the agent permanently.

The client `permission` message also lacked `toolCallId`, so the lookup couldn't be fixed
without updating both sides.

**Fix applied:**
- `ClientMessage` permission variant now carries `toolCallId`:
  `{ type: "permission"; toolCallId: string; optionId: string }`
- `handlePermissionResponse(toolCallId, optionId)` looks up by `toolCallId`.
- `handleClientMessage` passes both fields when dispatching.

---

## Issue #3 (BUG — FIXED): ACP responses checked for `.error` property that doesn't exist

**File:** `src/web/bridge.ts`

**Problem:**
The original `start()` checked `result.error` on `LoadSessionResponse`, `NewSessionResponse`,
and `PromptResponse`. None of these types have an `.error` field — the ACP SDK signals
failures by throwing exceptions, not by embedding error objects in responses. TypeScript
didn't catch this because the responses were inferred through the old `WebSocket` type alias
which masked the SDK types.

Concretely:
- `newSession.error` / `loadSession result.error` were always `undefined` — errors were
  silently swallowed.
- `result.error` on `PromptResponse` meant the `done` event was never sent to the client
  when the prompt succeeded.

**Fix applied:**
- Removed all `.error` checks. Errors are caught by the surrounding `try/catch`.
- `PromptResponse.stopReason` is always present; `done` is sent unconditionally on success.
- `loadSession` now correctly stores `existingSessionId` (returned by the caller, not
  the response which has no `sessionId`).

---

## Issue #4 (BUG — FIXED): `loadSession` missing required `cwd` and `mcpServers`

**File:** `src/web/bridge.ts`

**Problem:**
```ts
await this.connection.loadSession({ sessionId: existingSessionId });
```

`LoadSessionRequest` requires `cwd: string` and `mcpServers: Array<McpServer>`. TypeScript
didn't catch this because the DOM `WebSocket` type alias was hiding the ACP SDK types.

**Fix applied:**
```ts
await this.connection.loadSession({
  sessionId: existingSessionId,
  cwd: process.cwd(),
  mcpServers: [],
});
```

---

## Issue #5 (BUG — FIXED): `tool_call_update` used `"error"` instead of `"failed"`

**File:** `src/web/bridge.ts`

**Problem:**
The original code compared `update.status === "error"`, but `ToolCallStatus` is
`"pending" | "in_progress" | "completed" | "failed"` — `"error"` is not a valid value.
Any non-"completed" status (including "failed") was mapped to `"running"` on the client
side, hiding tool failures.

**Fix applied:**
```ts
const wsStatus: "running" | "done" | "error" =
  update.status === "completed" ? "done" :
  update.status === "failed"    ? "error" :
  "running";
```

---

## Issue #6 (BUG — FIXED): `POST /api/sessions` unreachable when `agentId` query param present

**File:** `src/web/server.ts`

**Problem:**
The GET `/api/sessions` branch had no method guard, so any request with `?agentId=` was
handled as a GET regardless of method. `POST /api/sessions?agentId=writing` returned a
session list instead of creating a session.

**Fix applied:**
All route branches now guard on `req.method` before inspecting the path. GET `/api/agents`
was also missing its method guard.

---

## Issue #7 (BUG — FIXED): Server started on import — side effect in module body

**File:** `src/web/server.ts` → `src/web/index.ts`

**Problem:**
`createServer(3000)` ran at module scope in `server.ts`. Any import of the module bound
port 3000 immediately, making the module untestable in isolation.

**Fix applied:**
`src/web/index.ts` was already present as the entry point (it already contained the startup
call). `server.ts` now exports only `createServer` with no top-level side effects.
`package.json` `server` script updated from `src/web/server.ts` → `src/web/index.ts`.

---

## Issue #8 (MISSING): No Phase 2 tests

**Problem:**
The ROADMAP requires:
- Bridge forwards `chunk` events correctly
- Bridge resolves permission requests through the WS message exchange

No test file covers Phase 2.

**Required tests (`tests/bridge.test.ts`):**
```ts
test("chunk event is forwarded to the WebSocket", async () => { ... });
test("tool_call sends action + action_detail messages", async () => { ... });
test("tool_call_update completed maps to done", async () => { ... });
test("tool_call_update failed maps to error", async () => { ... });
test("tool_call_update in_progress maps to running", async () => { ... });
test("handlePermissionResponse resolves the correct pending promise by toolCallId", () => { ... });
test("unknown client message type sends an error", () => { ... });
test("handleClientMessage: prompt dispatches to handlePrompt", () => { ... });
```

---

## End-of-phase checklist

- [x] `bunx tsc --noEmit` — zero type errors
- [x] `bun test` — all tests pass (40/40)
- [x] `ws.data.bridge` pattern — no `addEventListener`, messages routed via centralized handlers
- [x] Permission lookup uses `toolCallId` as key on both client and server
- [x] All route branches guarded by `req.method`
- [x] `server.ts` has no top-level side effects; startup is in `src/web/index.ts`
- [x] ACP responses use exception handling, not `.error` field checks
- [x] `loadSession` passes `cwd` and `mcpServers`
- [x] `tool_call_update` status mapping uses `"failed"` (correct ACP enum value)
- [ ] Phase 2 tests in `tests/bridge.test.ts`
