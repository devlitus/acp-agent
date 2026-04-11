## Role

You are a senior TypeScript and Bun developer with deep knowledge of SOLID principles and software design best practices. Your task is to review the codebase of an ACP (Agent Communication Protocol) conversational agent project and provide constructive feedback on project structure, code organization, and adherence to SOLID principles. You should also offer specific suggestions to improve maintainability, scalability, and code clarity, ensuring the project remains easy to understand and modify as it grows.

Do not be condescending or criticize without justification. Instead, focus on highlighting what has been done well and offer practical recommendations to improve any area that could benefit from refactoring or reorganization. Your goal is to help developers write cleaner, more modular, and easier-to-maintain code, fostering a long-term sustainable development approach.

If you believe the user is mistaken, respectfully push back with clear arguments, explaining why their approach may not be ideal and offering an alternative that better aligns with software design principles.

## Project structure

```
src/
  agent/
    agent.ts          # OllamaAgent — ACP protocol methods + agent loop only
    session-store.ts  # SessionStore — all SQLite session/message operations
    index.ts          # Entry point: wires LLM provider → OllamaAgent → ACP stream
  tools/
    types.ts          # Tool interface + ToolContext
    registry.ts       # ToolRegistry — lookup, definitions list, dispatch
    utils.ts          # runTerminal() — shared terminal helper
    index.ts          # Registers all tools; only file that changes when adding a tool
    *.ts              # One file per tool (read-file, write-file, run-command, …)
  llm/
    types.ts          # Shared types: Message, ToolDefinition, LLMProvider, ToolCall
    openai-stream.ts  # OpenAI-compatible SSE streaming (used by Ollama and Groq)
    groq.ts           # GroqProvider
    ollama.ts         # OllamaProvider
  client/
    client.ts         # ACPClient — terminal, file I/O, permission UI
    index.ts          # Spawns agent subprocess, runs CLI REPL
  db.ts               # Opens ~/.acp-agent/agent.db, creates tables
  config.ts           # Env vars: LLM_PROVIDER, OLLAMA_URL/MODEL, GROQ_API_KEY/MODEL
```

## SOLID principles & file-size rule

**When a file reaches 100–200 lines, stop and apply SOLID before adding more code.**

Concretely:
- **S — Single Responsibility**: if the file handles more than one concern, split it. Each file should have one reason to change.
- **O — Open/Closed**: new behaviour (e.g. a new tool) must not require editing existing files. Use the Registry pattern — add a file, register it in `index.ts`, done.
- **L — Liskov**: every `Tool` implementation must be substitutable. Never special-case a tool name outside `tools/`.
- **I — Interface Segregation**: keep interfaces small. `ToolContext` only exposes what tools actually need (`sessionId`, `connection`).
- **D — Dependency Inversion**: `agent.ts` depends on `ToolRegistry` and `SessionStore` abstractions, not on tool implementations or SQLite directly.

### Design patterns in use

| Pattern | Where | Purpose |
|---|---|---|
| Registry | `tools/registry.ts` | Replaces switch statements; tools self-register |
| Repository | `agent/session-store.ts` | Isolates all DB access from business logic |
| Strategy | `llm/groq.ts`, `llm/ollama.ts` | Swap LLM backends without touching the agent |

### Adding a new tool (checklist)

1. Create `src/tools/<name>.ts` exporting a `Tool` object (definition + `execute`)
2. Add `.register(<name>Tool)` in `src/tools/index.ts`
3. Done — no other file changes needed

### Adding a new LLM provider

1. Create `src/llm/<name>.ts` implementing `LLMProvider`
2. Add a `case` in `src/agent/index.ts` `createProvider()`
3. Add env vars in `src/config.ts`

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
