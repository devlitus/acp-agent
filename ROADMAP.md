# ACP Agent Platform — Roadmap

## Vision

Transform the current single-agent CLI into a **multi-agent web platform** accessible to both technical and non-technical users. Users pick a specialized agent from a hub, chat naturally, and the system handles complexity behind the scenes.

## Guiding Principles

All implementation follows the SOLID principles already established in this codebase:

| Principle | Application |
|-----------|-------------|
| **S** — Single Responsibility | Each agent config file owns one agent. Bridge class owns WS↔ACP translation only. |
| **O** — Open/Closed | Adding an agent = new file + register. No existing files change. |
| **L** — Liskov | Every `AgentConfig` is substitutable in the registry. The runner never special-cases an agent. |
| **I** — Interface Segregation | `AgentConfig` only exposes what the hub needs. Bridge only exposes what the WS handler needs. |
| **D** — Dependency Inversion | `server.ts` depends on `AgentRegistry` abstraction, not on specific agent files. |

---

## Architecture Overview

```
Browser
  │  HTTP (REST)      GET /api/agents, GET /api/sessions, POST /api/sessions
  │  WebSocket        One WS connection per active chat session
  ▼
src/web/server.ts     Bun.serve() — routes + WS upgrade
  │
src/web/bridge.ts     ACPWebSocketBridge — translates ACP ↔ WS JSON messages
  │
  ├── spawns ──▶  src/agent/index.ts (agent subprocess, env: AGENT_ID)
  │                     │
  │               reads AgentConfig from AgentRegistry
  │               injects systemPrompt + tool subset into OllamaAgent
  │
  └── uses ──▶   src/agents/registry.ts  (AgentRegistry)
                 src/tools/registry.ts   (ToolRegistry — unchanged)
```

---

## Target Agents

| ID | Name | Audience | Tools |
|----|------|----------|-------|
| `coding` | Coding Assistant | Technical | read-file, write-file, run-command, list-directory, search-files, save-memory, recall-memory |
| `writing` | Writing Assistant | All | read-file, write-file, save-memory, recall-memory |
| `devops` | DevOps Assistant | Technical | read-file, write-file, run-command, list-directory, search-files |
| `data` | Data Analyst | Mixed | read-file, write-file, run-command, list-directory, search-files |
| `research` | Research Assistant | All | web-search, fetch-url, write-file, save-memory, recall-memory |
| `personal` | Personal Assistant | All | save-memory, recall-memory, write-file, read-file |

---

## Final File Structure

```
src/
  agents/
    types.ts              # AgentConfig interface
    registry.ts           # AgentRegistry — lookup, list, validate
    index.ts              # Registers all agents; only file that changes when adding one
    coding.ts
    writing.ts
    devops.ts
    data.ts
    research.ts
    personal.ts
    prompts/
      coding.md           # System prompt as plain text — easy to tune without touching code
      writing.md
      devops.md
      data.md
      research.md
      personal.md

  tools/
    registry.ts           # +forAgent(tools: string[]): ToolRegistry — filtered view
    ...                   # (all existing tool files unchanged)
    web-search.ts         # NEW — for research agent
    fetch-url.ts          # NEW — for research agent

  agent/
    agent.ts              # OllamaAgent: systemPrompt + toolRegistry injected via constructor
    session-store.ts      # +agent_id and +title columns, +listByAgent()
    index.ts              # Reads AGENT_ID env var, resolves AgentConfig, wires everything

  web/
    server.ts             # Bun.serve() — HTTP routes + WS upgrade, depends on AgentRegistry
    bridge.ts             # ACPWebSocketBridge — ACP ↔ WS translation (single responsibility)
    index.html
    app.tsx               # React router: Hub ↔ Chat
    components/
      AgentHub.tsx        # Landing grid of agent cards + recent sessions
      AgentCard.tsx       # Card: icon, name, description, audience badge, Start button
      ChatView.tsx        # Chat interface for an active session
      ChatBubble.tsx      # User/agent message with markdown rendering
      ActionCard.tsx      # Tool call as collapsible card (simple label ↔ raw details)
      PermissionModal.tsx # Allow / Allow once / Deny dialog
      SessionSidebar.tsx  # History filtered by agent, with session title
      ModeToggle.tsx      # Simple ↔ Advanced mode (controls ActionCard verbosity)

  db.ts                   # Adds agent_id TEXT + title TEXT to sessions table (migration)
  config.ts               # +AGENT_ID env var
```

---

## Phases

### Phase 0 — Agent Configuration System
*Pure backend. No UI. The foundation everything else builds on.*

**Deliverables:**
- `src/agents/types.ts` — `AgentConfig` interface with `id`, `name`, `description`, `icon`, `audience`, `tools[]`, `systemPromptFile`, `suggestedPrompts[]`
- `src/agents/registry.ts` — `AgentRegistry` class (same pattern as `ToolRegistry`)
- `src/agents/prompts/*.md` — one system prompt file per agent
- `src/agents/{coding,writing,devops,data,research,personal}.ts` — agent configs
- `src/agents/index.ts` — registers all agents
- **Modify** `ToolRegistry`: add `forAgent(allowedTools: string[]): ToolRegistry` method
- **Modify** `OllamaAgent`: inject `systemPrompt: string` and `tools: ToolRegistry` via constructor instead of hardcoding them
- **Modify** `src/agent/index.ts`: read `AGENT_ID` from env, load config, pass to agent

**SOLID check:** Adding a 7th agent touches only `src/agents/` — zero changes to `agent.ts`, `tools/`, or `llm/`.

**Tests:**
- `AgentRegistry` throws on unknown agent ID
- `AgentRegistry` throws on startup if a tool listed in config doesn't exist in `ToolRegistry` (fail fast)
- `ToolRegistry.forAgent()` returns only the specified subset

---

### Phase 1 — Database Migration
*Isolated schema change. Only `db.ts` and `session-store.ts` change.*

**Deliverables:**
- **Modify** `db.ts`: add `agent_id TEXT NOT NULL DEFAULT 'coding'` and `title TEXT` to `sessions` table (with `ALTER TABLE` migration guard)
- **Modify** `SessionStore`:
  - `create(sessionId, agentId)` — stores agent_id
  - `setTitle(sessionId, title)` — stores auto-generated title
  - `listByAgent(agentId)` — for sidebar history

**Why `title`?** Auto-generated from the user's first message (truncated to 60 chars). No LLM call needed.

**Tests:**
- `SessionStore.listByAgent()` returns only sessions for the given agent
- `SessionStore.setTitle()` updates correctly

---

### Phase 2 — Web Server + WebSocket Bridge
*Backend only. No frontend yet. Testable with `wscat` or Postman.*

**Deliverables:**
- `src/web/bridge.ts` — `ACPWebSocketBridge` class:
  - Spawns agent subprocess with `AGENT_ID` env var
  - Translates ACP events → WS JSON messages (`chunk`, `action`, `permission`, `done`, `error`)
  - Receives WS messages → calls `connection.prompt()` or `connection.cancel()`
- `src/web/server.ts` — `Bun.serve()`:
  - `GET /api/agents` — returns agent list from `AgentRegistry`
  - `GET /api/sessions?agentId=` — returns session history from `SessionStore`
  - `POST /api/sessions` — creates session, returns `{ sessionId }`
  - `GET /ws` — upgrades to WebSocket, creates `ACPWebSocketBridge`

**WS message protocol (client ↔ server):**
```ts
// Client → Server
{ type: "prompt", text: string }
{ type: "cancel" }
{ type: "permission", optionId: string }

// Server → Client
{ type: "chunk", text: string }
{ type: "action", toolCallId: string, title: string, status: "running"|"done"|"error" }
{ type: "action_detail", toolCallId: string, input: unknown, output: string }
{ type: "permission", toolCallId: string, title: string, options: { id: string, name: string, kind: string }[] }
{ type: "done", stopReason: string }
{ type: "error", message: string }
```

**Tests:**
- Bridge forwards `chunk` events correctly
- Bridge resolves permission requests through the WS message exchange

---

### Phase 3 — Frontend: Agent Hub
*First visible UI. Users can browse and select agents.*

**Deliverables:**
- `src/web/index.html` — shell HTML
- `src/web/app.tsx` — React app with simple router (`hub` | `chat`)
- `AgentHub.tsx` — agent grid + recent sessions list
- `AgentCard.tsx` — icon, name, description, audience badge (`For everyone` | `Advanced`), Start button

**UX decisions:**
- Agents are sorted: general-audience first, technical last
- Each card shows 2–3 example prompts on hover/tap
- Recent sessions show agent icon + title + relative time

---

### Phase 4 — Frontend: Chat Interface
*Core interaction. Streaming, tool visualization, permissions.*

**Deliverables:**
- `ChatView.tsx` — header (agent name + back button + mode toggle), message list, input bar
- `ChatBubble.tsx` — markdown rendering (use `marked` or similar), user vs agent styling
- `ActionCard.tsx`:
  - Simple mode: `📄 Reading config.json... ✓`
  - Advanced mode: collapsible JSON with input/output
- `PermissionModal.tsx` — blocks input until resolved:
  ```
  ⚠️ The agent wants to run a command
  > npm install express
  [Deny]  [Allow once]  [Always allow]
  ```
- `ModeToggle.tsx` — persisted in `localStorage`

---

### Phase 5 — Frontend: Session History
*Continuity between conversations.*

**Deliverables:**
- `SessionSidebar.tsx` — collapsible panel, sessions grouped by agent
- Auto-title: set from first user message (truncated) on `SessionStore.save()`
- Load session: clicking a past session calls `GET /api/sessions/:id/messages` and replays history

---

### Phase 6 — New Tools for Specialized Agents
*Unlocks research and richer data workflows.*

**Deliverables:**
- `src/tools/web-search.ts` — wraps a search API (DuckDuckGo or Brave Search)
- `src/tools/fetch-url.ts` — fetches and extracts readable text from a URL

**SOLID check:** Two new files + two new `.register()` calls in `tools/index.ts`. Nothing else changes.

---

### Phase 7 — Polish & Production Readiness

**Deliverables:**
- Error boundaries in React (show friendly message, not stack trace)
- Empty state for new sessions (show suggested prompts from agent config)
- Mobile-responsive layout
- `AGENT_ID` validation with clear startup error message
- README section on how to add a new agent (3 steps)
- End-to-end test: spawn server, send WS prompt, assert response stream

---

## Key Design Decisions

### Why `.md` files for system prompts?
System prompts change frequently during tuning. Keeping them as `.md` files means:
- Non-developers can edit agent behavior without touching TypeScript
- Git diffs are readable prose, not escaped string changes
- Easy to review and compare prompts across agents

### Why `forAgent()` instead of subclassing `ToolRegistry`?
Subclassing would break the Liskov principle — a subclass might behave differently in unexpected ways. A factory method on the existing class returns a filtered view while keeping the single source of truth.

### Why `AGENT_ID` env var instead of a network call?
The agent runs as a subprocess. Environment variables are the standard IPC mechanism for configuration at spawn time — no network roundtrip, no coupling between server and agent at the protocol level.

### Why auto-title from first message instead of LLM-generated?
LLM title generation adds latency and cost to every new session. A truncated first message is fast, free, and good enough for 90% of use cases. A "rename" option can be added later.

---

## What Changes in Existing Files

| File | Change | Reason |
|------|--------|--------|
| `src/agent/agent.ts` | Inject `systemPrompt` + `ToolRegistry` via constructor | Remove hardcoded coupling |
| `src/agent/index.ts` | Read `AGENT_ID`, resolve `AgentConfig`, pass to agent | Multi-agent entry point |
| `src/tools/registry.ts` | Add `forAgent(tools: string[])` method | Tool subset per agent |
| `src/db.ts` | Add `agent_id`, `title` columns to sessions | History sidebar support |
| `src/agent/session-store.ts` | Add `listByAgent()`, `setTitle()` | History sidebar support |
| `src/config.ts` | Add `AGENT_ID` env var | Agent selection at spawn time |

**Everything else in `src/tools/`, `src/llm/`, and `src/client/` is untouched.**
