# TASK-017 — README actualizado

**Estado:** ✅ Done  
**Asignado a:** GLM-4.7  
**Prioridad:** Media  
**Depende de:** —  
**Desbloquea:** —

---

## Objetivo

El `README.md` actual está desactualizado — referencia archivos que ya no existen (`src/agent.ts`, `src/client.ts`). Reescríbelo para reflejar el estado real del proyecto e incluir las guías de extensión que cualquier desarrollador nuevo necesita.

---

## Archivo a modificar

```
README.md   ← reescribir completamente
```

---

## Estructura del README nuevo

El README debe tener estas secciones, en este orden:

```
# ACP Agent Platform
[descripción de 2-3 líneas]

## Prerequisites
## Installation
## Running
## Environment variables
## How to add a new agent (3 pasos)
## How to add a new tool (3 pasos)
## Project structure
## Running tests
```

---

## Contenido de cada sección

### `# ACP Agent Platform`

```markdown
# ACP Agent Platform

A multi-agent web platform built with [ACP (Agent Communication Protocol)](https://agentclientprotocol.com),
TypeScript, and Bun. Users pick a specialized agent from a hub and chat with it in real time.
The agent can use tools (read files, run commands, search the web) and requests permission before
any destructive action.
```

### `## Prerequisites`

```markdown
## Prerequisites

- [Bun](https://bun.sh) ≥ 1.x
- [Ollama](https://ollama.ai) running locally, or a Groq API key
```

### `## Installation`

```markdown
## Installation

\`\`\`bash
bun install
\`\`\`
```

### `## Running`

```markdown
## Running

\`\`\`bash
# Start the web server (serves the UI + handles WebSocket connections to agents)
bun run server
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

The server spawns an agent subprocess for each chat session automatically.
You do not need to run the agent manually.

### CLI client (optional)

\`\`\`bash
bun run client
\`\`\`

A terminal-based client for testing the agent directly without the web UI.
```

### `## Environment variables`

```markdown
## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `ollama` | LLM backend: `ollama` or `groq` |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3.5:latest` | Model name for Ollama |
| `GROQ_API_KEY` | — | Required when `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | `qwen/qwen3-32b` | Model name for Groq |
| `BRAVE_API_KEY` | — | Required for the Research agent's web search |

Bun automatically loads `.env` files — no need to install dotenv.
```

### `## How to add a new agent`

Esta sección es el núcleo de la tarea. Debe ser exacta y verificable:

```markdown
## How to add a new agent

Three steps, no existing files change except `src/agents/index.ts`.

**1. Create the agent config** `src/agents/<name>.ts`

\`\`\`ts
import type { AgentConfig } from "./types.ts";

export const myAgent: AgentConfig = {
  id: "my-agent",
  name: "My Agent",
  description: "What this agent does, shown on the hub card.",
  icon: "🤖",
  audience: "all",            // "all" | "technical" | "mixed"
  tools: ["read_file", "write_file"],
  systemPromptFile: "my-agent.md",
  suggestedPrompts: [
    "First example prompt",
    "Second example prompt",
  ],
};
\`\`\`

**2. Write the system prompt** `src/agents/prompts/my-agent.md`

Plain Markdown. Describe the agent's role, constraints, and behavior.
Non-developers can edit this without touching TypeScript.

**3. Register it** in `src/agents/index.ts`

\`\`\`ts
import { myAgent } from "./my-agent.ts";

export const registry = new AgentRegistry()
  // ...existing agents...
  .register(myAgent);
\`\`\`

Done. The agent appears on the hub automatically.

> **Available tool names:** `read_file`, `write_file`, `run_command`, `list_directory`,
> `search_files`, `save_memory`, `recall_memory`, `web_search`, `fetch_url`
```

### `## How to add a new tool`

```markdown
## How to add a new tool

Three steps, no existing files change except `src/tools/index.ts`.

**1. Create the tool** `src/tools/<name>.ts`

\`\`\`ts
import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

export const myTool: Tool = {
  kind: "read",   // "read" = no permission needed | "execute" = asks user first
  definition: {
    name: "my_tool",           // snake_case, unique across all tools
    description: "...",        // the LLM reads this to decide when to call it
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "..." },
      },
      required: ["input"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const input = toolCall.arguments.input as string;
    // ... implementation ...
    return "result as string";
  },
};
\`\`\`

**2. Register it** in `src/tools/index.ts`

\`\`\`ts
import { myTool } from "./my-tool.ts";

export const registry = new ToolRegistry()
  // ...existing tools...
  .register(myTool);
\`\`\`

**3. Grant access to agents** — in each `src/agents/<name>.ts` that should use it, add `"my_tool"` to the `tools` array.

Done. No other file changes needed.
```

### `## Project structure`

```markdown
## Project structure

\`\`\`
src/
  agent/
    agent.ts          # OllamaAgent — ACP protocol + agent loop
    session-store.ts  # All SQLite operations (sessions + messages)
    index.ts          # Entry point for agent subprocess

  agents/
    registry.ts       # AgentRegistry — lookup, list, validate
    types.ts          # AgentConfig interface
    index.ts          # Registers all agents
    coding.ts         # One file per agent config
    writing.ts
    devops.ts
    data.ts
    research.ts
    personal.ts
    prompts/          # System prompts as .md files (editable without code changes)

  tools/
    registry.ts       # ToolRegistry — lookup, dispatch, forAgent()
    types.ts          # Tool interface + ToolContext
    index.ts          # Registers all tools
    read-file.ts      # One file per tool
    write-file.ts
    run-command.ts
    list-directory.ts
    search-files.ts
    save-memory.ts
    recall-memory.ts
    web-search.ts
    fetch-url.ts

  llm/
    types.ts          # Message, ToolDefinition, LLMProvider interfaces
    openai-stream.ts  # Shared SSE streaming (used by Ollama + Groq)
    ollama.ts         # OllamaProvider
    groq.ts           # GroqProvider

  web/
    server.ts         # Bun.serve() — HTTP routes + WebSocket upgrade
    bridge.ts         # ACPWebSocketBridge — translates ACP ↔ WebSocket messages
    index.ts          # Server entry point
    app.tsx           # React app: Hub ↔ Chat router
    components/
      AgentHub.tsx
      AgentCard.tsx
      ChatView.tsx
      ChatBubble.tsx
      ActionCard.tsx
      PermissionModal.tsx
      SessionSidebar.tsx
      ModeToggle.tsx
      ErrorBoundary.tsx

  client/
    client.ts         # Terminal UI client (CLI)
    index.ts          # CLI entry point

  db.ts               # Opens ~/.acp-agent/agent.db, runs migrations
  config.ts           # All environment variables with defaults
\`\`\`
```

### `## Running tests`

```markdown
## Running tests

\`\`\`bash
bun test
\`\`\`

Tests are co-located with the source files they test (`*.test.ts`).
\`\`\`
src/agents/registry.test.ts       # AgentRegistry unit tests
src/agent/session-store.test.ts   # SessionStore unit tests
src/tools/registry.test.ts        # ToolRegistry unit tests
src/web/server.test.ts            # HTTP + WebSocket integration tests
\`\`\`
```

---

## Criterios de aceptación

- [ ] El README no referencia `src/agent.ts` ni `src/client.ts` (archivos que no existen)
- [ ] La sección "How to add a new agent" tiene exactamente 3 pasos numerados con código de ejemplo
- [ ] La sección "How to add a new tool" tiene exactamente 3 pasos numerados con código de ejemplo
- [ ] La tabla de variables de entorno incluye `BRAVE_API_KEY`
- [ ] La sección "Project structure" refleja la estructura real del proyecto
- [ ] Los scripts de `bun run` coinciden con los definidos en `package.json`
- [ ] Markdown válido (sin sintaxis rota)
- [ ] Sin promesas falsas — no describas features que no existen

---

## Notas del senior

- La guía de 3 pasos es el corazón de la tarea. El test mental es: ¿puede alguien que no conoce el proyecto añadir un agente nuevo siguiendo solo estos 3 pasos sin consultar nada más? Si la respuesta es no, la guía no está completa.
- Los backticks en código dentro de Markdown van escapados con `\` cuando están dentro de un bloque de código Markdown (usar `\`\`\`` en lugar de `\`\`\``). En el README final deben aparecer sin backslash.
- No copies literalmente el código de arriba — adáptalo al estado real del proyecto cuando esta tarea se ejecute. Los nombres de archivos y herramientas deben coincidir exactamente con lo que existe.
- La sección de estructura del proyecto puede omitir `node_modules/`, tests y archivos de configuración como `tsconfig.json`. Solo lo que el desarrollador necesita conocer.

---

## Notas del junior

> _README.md reescrito completamente con:_
> _- Descripción actualizada del proyecto_
> _- Secciones de Prerequisites, Installation, Running_
> _- Tabla de variables de entorno con todas las opciones (incluyendo BRAVE_API_KEY)_
> _- Guías paso a paso para añadir nuevos agentes y herramientas (3 pasos cada una)_
> _- Estructura del proyecto reflejando el estado real_
> _- Sección de ejecución de pruebas_
> _- Referencias correctas a archivos existentes (no src/agent.ts ni src/client.ts)_
