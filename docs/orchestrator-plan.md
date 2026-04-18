# Plan: Orchestrator Agent

## Objetivo

El usuario siempre interactúa con un único agente orquestador (personalidad consistente, sin fricción de selección). El orquestador detecta la intención del usuario y delega internamente al sub-agente especializado más adecuado. Los sub-agentes no spawnan subprocesos — el orquestador los invoca directamente llamando al LLM con el system prompt de cada uno.

---

## Flujo actual vs. nuevo

### Actual
```
Usuario → AgentHub (elige agente) → WebSocket /ws?agentId=X
  → bridge.ts spawn("bun", "src/agent/index.ts", { AGENT_ID: X })
  → ACP sobre stdin/stdout → OllamaAgent
```

### Nuevo
```
Usuario → Chat directo → WebSocket /ws
  → bridge.ts instancia OllamaAgent(orchestrator) in-process
  → OllamaAgent llama tool invoke_agent(agentId, task)
  → invoke_agent llama LLM con system prompt del sub-agente + ctx.signal
  → resultado vuelve al orchestrator como tool result
  → orchestrator sintetiza y responde
```

---

## Decisiones arquitectónicas resueltas

### Riesgo 1 — AgentSideConnection es clase concreta con #private

`AgentSideConnection` del SDK no se puede extender ni mockear directamente. Sin embargo, `OllamaAgent` solo usa dos métodos: `sessionUpdate()` y `requestPermission()`.

**Decisión: extraer interfaz propia `AgentConnection` (Dependency Inversion)**

```typescript
// src/agent/types.ts
export interface AgentConnection {
  sessionUpdate(params: acp.SessionNotification): Promise<void>;
  requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse>;
}
```

- `OllamaAgent` recibe `AgentConnection` en lugar de `acp.AgentSideConnection`
- La clase real del SDK la satisface implícitamente (structural typing de TypeScript)
- El `DirectConnection` in-process también la implementa
- Cero casts, cero hacks

### Riesgo 2 — Propagación de AbortSignal al sub-agente

`ToolContext` ya tiene `signal: AbortSignal`. La tool `invoke_agent` lee `ctx.signal` y lo pasa al loop del sub-agente. Cuando el usuario cancela, el signal se aborta y el sub-agente para automáticamente. No requiere cambios adicionales.

---

## Iteraciones de implementación

### Iteración 1 — Backend base (sin romper nada)

**Objetivo:** el orchestrator existe y se valida, pero nadie lo usa aún. Los 53 tests siguen pasando.

#### 1a. Crear `src/agent/types.ts`

Nueva interfaz `AgentConnection` que desacopla `OllamaAgent` del SDK concreto:

```typescript
import type * as acp from "@agentclientprotocol/sdk";

export interface AgentConnection {
  sessionUpdate(params: acp.SessionNotification): Promise<void>;
  requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse>;
}
```

#### 1b. Modificar `src/agent/agent.ts`

- Cambiar `private connection: acp.AgentSideConnection` → `private connection: AgentConnection`
- Importar `AgentConnection` desde `./types.ts`
- Sin cambios en la lógica

#### 1c. Modificar `src/tools/types.ts`

Añadir campos opcionales a `ToolContext`:

```typescript
export interface ToolContext {
  sessionId: string;
  connection: AgentConnection;          // ya existe, cambio de tipo
  signal: AbortSignal;                  // ya existe
  llm?: LLMProvider;                    // nuevo: para invoke_agent
  onSubAgentChange?: (                  // nuevo: para indicador UI
    agentId: string | null,
    agentName: string,
    agentIcon: string
  ) => void;
}
```

#### 1d. Crear `src/tools/invoke-agent.ts`

Tool exclusiva del orchestrator. Ejecuta el loop del sub-agente in-process:

```typescript
export const invokeAgentTool: Tool = {
  definition: {
    name: "invoke_agent",
    description: "Delega una tarea a un agente especializado",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string", enum: ["coding", "writing", "research", "personal", "data", "devops"] },
        task: { type: "string", description: "Descripción completa de la tarea" },
        context_summary: { type: "string", description: "Contexto relevante de la conversación (opcional)" },
      },
      required: ["agent_id", "task"],
    },
  },
  async execute(args, ctx) {
    // 1. Resolver AgentConfig del sub-agente
    // 2. Construir historial: [system, ...context, user_task]
    // 3. Emitir sub_agent_start via ctx.onSubAgentChange
    // 4. Ejecutar loop LLM con ctx.signal (propagación de cancel automática)
    // 5. Emitir sub_agent_end via ctx.onSubAgentChange
    // 6. Retornar texto acumulado
  },
};
```

**Nota SOLID:** si supera 100 líneas, extraer el mini-loop a `src/tools/invoke-agent-loop.ts`.

#### 1e. Registrar en `src/tools/index.ts`

```typescript
registry.register(invokeAgentTool);
```

`invoke_agent` se registra globalmente pero solo el orchestrator la tendrá en su `tools[]`. El `ToolRegistry.forAgent()` garantiza el aislamiento.

#### 1f. Crear `src/agents/prompts/orchestrator.md`

System prompt del orquestador. Puntos clave:
- Personalidad consistente: amigable, directa, sin mencionar sub-agentes al usuario
- Tabla de cuándo usar cada sub-agente
- Cuándo responder directamente (conversación simple, aclarar intención)
- Cuándo usar `invoke_agent` (tarea requiere tools especializadas)

#### 1g. Crear `src/agents/orchestrator.ts` y registrar en `src/agents/index.ts`

```typescript
export const orchestratorAgent: AgentConfig = {
  id: "orchestrator",
  name: "ACP Assistant",
  description: "Tu asistente inteligente",
  icon: "◈",
  audience: "all",
  tools: ["invoke_agent"],
  systemPromptFile: "orchestrator.md",
  suggestedPrompts: [...],
};
```

**Archivos modificados:** `src/agent/types.ts` (nuevo), `src/agent/agent.ts`, `src/tools/types.ts`, `src/tools/invoke-agent.ts` (nuevo), `src/tools/index.ts`, `src/agents/prompts/orchestrator.md` (nuevo), `src/agents/orchestrator.ts` (nuevo), `src/agents/index.ts`

---

### Iteración 2 — Bridge in-process (lo más delicado)

**Objetivo:** el bridge ya no spawna subprocesos. Conecta directamente al OllamaAgent del orchestrator.

#### 2a. Crear `src/web/direct-connection.ts`

Implementación de `AgentConnection` que redirige al WebSocket:

```typescript
import type { AgentConnection } from "../agent/types.ts";

export class DirectConnection implements AgentConnection {
  constructor(private ws: Bun.ServerWebSocket<unknown>) {}

  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    // traducir params a ServerMessage y enviar por WebSocket
  }

  async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
    // enviar permission request al WebSocket y esperar respuesta
  }
}
```

#### 2b. Modificar `src/web/bridge.ts`

Reemplazar el bloque de `spawn()` por:

```typescript
async start(existingSessionId?: string): Promise<void> {
  const config = agentRegistry.get("orchestrator");
  const systemPrompt = agentRegistry.getSystemPrompt(config);
  const llm = createProvider();
  const tools = toolRegistry.forAgent(config.tools);

  this.connection = new DirectConnection(this.ws, this.pendingPermissions);
  this.agent = new OllamaAgent(this.connection, llm, systemPrompt, tools, "orchestrator");

  const { sessionId } = existingSessionId
    ? await this.agent.loadSession({ sessionId: existingSessionId, ... })
    : await this.agent.newSession({ cwd: process.cwd(), ... });

  this.sessionId = sessionId;
}
```

`handlePrompt`, `handleCancel`, `cleanup` se simplifican — ya no hay proceso hijo que matar.

#### 2c. Modificar `src/web/server.ts`

El parámetro `agentId` del WebSocket se ignora internamente (siempre orchestrator). Se mantiene en la URL por compatibilidad con los tests.

**Archivos modificados:** `src/web/direct-connection.ts` (nuevo), `src/web/bridge.ts`, `src/web/server.ts`

---

### Iteración 3 — Nueva UX frontend

**Objetivo:** el usuario va directamente al chat, sin pantalla de selección de agente.

#### 3a. Modificar `src/web/app.tsx`

- Eliminar el estado `currentView` hub/chat
- Vista inicial: `ChatView` con `agentId="orchestrator"` y `sessionId=null`
- `AgentHub` deja de importarse (no se elimina el archivo aún)

#### 3b. Modificar `src/web/components/ChatView.tsx`

- Ajustar EmptyState: mensajes sugeridos genéricos del orchestrator
- El botón "Back" puede navegar al historial en lugar de al hub

#### 3c. Modificar `src/web/components/SessionSidebar.tsx`

- Siempre filtra por `agentId="orchestrator"`
- El parámetro puede hardcodearse o recibirse del padre

**Archivos modificados:** `src/web/app.tsx`, `src/web/components/ChatView.tsx`, `src/web/components/SessionSidebar.tsx`

---

### Iteración 4 — Indicador de sub-agente activo

**Objetivo:** el usuario ve qué sub-agente está trabajando en tiempo real.

#### 4a. Nuevos tipos de mensaje WebSocket

En `src/web/bridge.ts` y `src/web/hooks/useChatSession.ts`:

```typescript
| { type: "sub_agent_start"; agentId: string; agentName: string; agentIcon: string }
| { type: "sub_agent_end"; agentId: string }
```

#### 4b. Emitir desde `invoke-agent.ts`

La tool llama `ctx.onSubAgentChange(agentId, agentName, agentIcon)` al inicio y `ctx.onSubAgentChange(null, "", "")` al final. El bridge rellena este callback al construir el `ToolContext`.

#### 4c. Crear `src/web/components/SubAgentIndicator.tsx`

Componente compacto que aparece en el chat:
```
🔍 Research Assistant buscando información...
```
Desaparece cuando llega `sub_agent_end`.

#### 4d. Modificar `src/web/hooks/useChatSession.ts` y `ChatView.tsx`

- Hook maneja los nuevos tipos de mensaje
- ChatView renderiza `SubAgentIndicator` cuando hay sub-agente activo

**Archivos modificados:** `src/web/bridge.ts`, `src/web/hooks/useChatSession.ts`, `src/web/components/SubAgentIndicator.tsx` (nuevo), `src/web/components/ChatView.tsx`

---

### Iteración 5 — Tests y limpieza

**Objetivo:** cobertura del orchestrator y limpieza de código obsoleto.

#### Tests a añadir

- `src/tools/invoke-agent.test.ts` — mockea LLMProvider, verifica routing y propagación de signal
- `src/agents/orchestrator.test.ts` — verifica config y que el archivo .md existe
- `src/web/server.test.ts` — casos para orchestrator en `/api/agents` y `/api/sessions`

#### Compatibilidad de sesiones antiguas

Las sesiones existentes con `agent_id != "orchestrator"` no se migran. El bridge, al hacer `loadSession`, verifica que el `agent_id` de la sesión sea `"orchestrator"`. Si no, crea una nueva sesión y lo informa al usuario.

#### Archivos obsoletos (no eliminar hasta validar)

- `src/web/components/AgentHub.tsx`
- `src/web/components/AgentCard.tsx`
- `src/web/components/AgentSessionGroup.tsx` (ya eliminado)

---

## Orden de dependencias

```
Iteración 1 → puede hacerse sin romper nada
Iteración 2 → depende de Iteración 1
Iteración 3 → depende de Iteración 2 (para poder probar el chat)
Iteración 4 → depende de Iteración 2 (protocolo WebSocket)
              puede hacerse en paralelo con Iteración 3
Iteración 5 → depende de todas las anteriores
```

---

## Qué NO cambia

- El protocolo ACP (se sigue usando para el loop del agente)
- `OllamaAgent` (salvo el tipo de `connection`)
- `ToolRegistry`, `AgentRegistry`, `SessionStore`
- Los endpoints HTTP (`/api/agents`, `/api/sessions`, etc.)
- Los 53 tests existentes (deben seguir pasando en cada iteración)
- Los sub-agentes y sus system prompts (se invocan in-process, no desaparecen)
