# TASK-018 — End-to-end test: servidor HTTP + WebSocket

**Estado:** ✅ Done  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** Phase 4+5 completadas (endpoints /messages y WebSocket existen)  
**Desbloquea:** —

---

## Objetivo

Crear tests de integración que arrancan el servidor real y verifican que los endpoints HTTP y la conexión WebSocket funcionan correctamente. A diferencia de los tests unitarios existentes (que usan DB en memoria), estos tests levantan el `Bun.serve()` completo.

---

## Contexto — qué testar y qué no

**Sí testar** (capa de servidor, sin LLM):
- `GET /api/agents` — devuelve el listado de agentes
- `POST /api/sessions` — crea una sesión
- `GET /api/sessions?agentId=` — lista sesiones
- `GET /api/sessions/:id/messages` — devuelve mensajes
- `GET /ws` — la conexión WebSocket se establece

**No testar** (requeriría LLM real o mocking complejo):
- Conversación completa via WebSocket (chunks, done, etc.)
- Tool calls y permisos

El ROADMAP dice "spawn server, send WS prompt, assert response stream" — pero hacerlo de forma determinista sin LLM requeriría mockear el agente. Vamos a testear la capa de servidor, que es lo que tiene valor real sin depender de infraestructura externa.

---

## Archivo a crear

```
src/web/server.test.ts
```

---

## Setup: puerto aleatorio

`Bun.serve({ port: 0 })` hace que el SO asigne un puerto libre. `server.port` da el puerto real asignado. Esto evita conflictos entre tests en CI.

---

## Código del test completo

```ts
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { createServer } from "./server.ts";

let server: ReturnType<typeof createServer>;
let base: string;

beforeAll(() => {
  server = createServer(0);
  base = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

// ──────────────────────────────────────────
// GET /api/agents
// ──────────────────────────────────────────

describe("GET /api/agents", () => {
  test("returns 200 with a non-empty array", async () => {
    const res = await fetch(`${base}/api/agents`);
    expect(res.status).toBe(200);

    const agents = await res.json() as unknown[];
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  test("each agent has id, name, icon, and suggestedPrompts", async () => {
    const res = await fetch(`${base}/api/agents`);
    const agents = await res.json() as Record<string, unknown>[];

    for (const agent of agents) {
      expect(typeof agent.id).toBe("string");
      expect(typeof agent.name).toBe("string");
      expect(typeof agent.icon).toBe("string");
      expect(Array.isArray(agent.suggestedPrompts)).toBe(true);
    }
  });
});

// ──────────────────────────────────────────
// POST /api/sessions
// ──────────────────────────────────────────

describe("POST /api/sessions", () => {
  test("creates a session and returns sessionId", async () => {
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "coding" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(typeof data.sessionId).toBe("string");
    expect((data.sessionId as string).length).toBeGreaterThan(0);
  });

  test("uses 'coding' as default agentId when not provided", async () => {
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(typeof data.sessionId).toBe("string");
  });
});

// ──────────────────────────────────────────
// GET /api/sessions?agentId=
// ──────────────────────────────────────────

describe("GET /api/sessions", () => {
  test("returns 200 with array for a valid agentId", async () => {
    const res = await fetch(`${base}/api/sessions?agentId=coding`);
    expect(res.status).toBe(200);
    const sessions = await res.json();
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("returns 400 when agentId param is missing", async () => {
    const res = await fetch(`${base}/api/sessions`);
    expect(res.status).toBe(400);
  });

  test("session created via POST appears in GET list", async () => {
    // Create a session
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "writing" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };

    // List sessions for that agent
    const listRes = await fetch(`${base}/api/sessions?agentId=writing`);
    const sessions = await listRes.json() as { id: string }[];

    expect(sessions.some(s => s.id === sessionId)).toBe(true);
  });
});

// ──────────────────────────────────────────
// GET /api/sessions/:id/messages
// ──────────────────────────────────────────

describe("GET /api/sessions/:id/messages", () => {
  test("returns empty array for a newly created session", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "coding" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };

    const res = await fetch(`${base}/api/sessions/${sessionId}/messages`);
    expect(res.status).toBe(200);

    const messages = await res.json();
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("returns 404 for a non-existent session ID", async () => {
    const res = await fetch(`${base}/api/sessions/this-does-not-exist/messages`);
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────
// GET /ws — WebSocket upgrade
// ──────────────────────────────────────────

describe("WebSocket /ws", () => {
  test("successfully upgrades the connection", async () => {
    const wsUrl = `ws://localhost:${server.port}/ws?agentId=coding`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timed out"));
      }, 5000);

      ws.addEventListener("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.addEventListener("error", (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${JSON.stringify(event)}`));
      });
    });
  });

  test("returns 404 for unknown paths", async () => {
    const res = await fetch(`${base}/unknown/path`);
    expect(res.status).toBe(404);
  });
});
```

---

## Ejecutar los tests

```bash
bun test src/web/server.test.ts
```

O para correr todos los tests del proyecto:

```bash
bun test
```

---

## Criterios de aceptación

- [ ] `beforeAll` arranca el servidor en puerto 0 (aleatorio)
- [ ] `afterAll` para el servidor limpiamente con `server.stop(true)`
- [ ] `GET /api/agents` → 200, array no vacío, cada agente tiene `id`, `name`, `icon`, `suggestedPrompts`
- [ ] `POST /api/sessions` → 200, devuelve `sessionId` de tipo string
- [ ] `POST /api/sessions` sin body → usa `"coding"` por defecto, no falla
- [ ] `GET /api/sessions?agentId=` → 200 con array
- [ ] `GET /api/sessions` sin agentId → 400
- [ ] Sesión creada con POST aparece en GET list del agente correcto
- [ ] `GET /api/sessions/:id/messages` nueva sesión → 200 array vacío
- [ ] `GET /api/sessions/noexiste/messages` → 404
- [ ] WebSocket `/ws?agentId=coding` → connection `open` sin error
- [ ] Ruta desconocida → 404
- [ ] `bun test src/web/server.test.ts` pasa todos los tests sin errores

---

## Notas del senior

- `server.stop(true)` — el argumento `true` fuerza el cierre inmediato sin esperar conexiones activas. Sin él, el proceso `bun test` podría quedarse colgado esperando que el servidor termine limpiamente.
- El test de WebSocket tiene `setTimeout` de 5 segundos como fallback. Si el servidor no acepta la conexión en ese tiempo, el test falla con timeout. Es suficiente para un test local; en CI podría necesitar más.
- El test de WebSocket solo verifica que la conexión `open` se dispara. No envía mensajes ni espera respuesta — eso requeriría un LLM real. La capa de servidor queda cubierta.
- `as unknown[]` y `as Record<string, unknown>[]` son los casts mínimos necesarios para tipar los JSON de respuesta sin usar `any`. No uses `any` — el senior lo rechazará en la revisión.
- Los tests tienen dependencias entre ellos (el test de "aparece en lista" crea una sesión y luego la busca). En general, los tests deberían ser independientes. Aquí es aceptable porque es un test de integración y queremos validar el flujo completo.
- Si en algún momento `bun test` corre los tests en paralelo y la DB compartida causa conflictos, añadir `--sequential` en el script: `bun test --sequential`. Por ahora no es necesario.

---

## Notas del junior

> _Creado src/web/server.test.ts con tests de integración end-to-end:_
> _- beforeAll: servidor en puerto aleatorio (port: 0)_
> _- afterAll: server.stop(true) para limpieza_
> _- Tests para GET /api/agents (200, array no vacío, estructura correcta)_
> _- Tests para POST /api/sessions (crea sesión, default agentId)_
> _- Tests para GET /api/sessions (con/sin agentId, sesión aparece en lista)_
> _- Tests para GET /api/sessions/:id/messages (array vacío, 404 si no existe)_
> _- Tests para WebSocket /ws (upgrade exitoso)_
> _- Test para rutas desconocidas (404)_
> _- Todos los tests pasan (11 pass, 0 fail)_
