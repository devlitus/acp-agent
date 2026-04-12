# TASK-007 — GET /api/sessions/:id/messages

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** Phase 4 completada  
**Desbloquea:** TASK-008, TASK-009

---

## Objetivo

Añadir un endpoint REST que devuelve los mensajes de una sesión en un formato simple que el frontend pueda renderizar directamente. También añadir el método correspondiente en `SessionStore`.

---

## Archivos a modificar

```
src/agent/session-store.ts    ← añadir método getDisplayMessages()
src/web/server.ts             ← añadir ruta GET /api/sessions/:id/messages
```

---

## Contexto del schema

La tabla `messages` tiene estas columnas (ver `src/db.ts`):
```sql
session_id   TEXT
seq          INTEGER   -- orden del mensaje
role         TEXT      -- "user" | "assistant" | "tool" | "system"
content      TEXT      -- texto del mensaje (puede ser null si es solo tool_calls)
tool_calls   TEXT      -- JSON serializado (solo mensajes assistant con herramientas)
tool_call_id TEXT      -- solo mensajes role="tool"
```

El frontend solo necesita mostrar mensajes de texto. Los mensajes `tool`, `system` y los `assistant` sin `content` (solo tool_calls) no se muestran.

---

## Cambio 1 — `session-store.ts`

### Tipo de retorno (añadir al inicio del archivo, después de `MessageRow`)

```ts
export type DisplayMessage = {
  role: "user" | "agent";
  text: string;
};
```

### Método nuevo en la clase `SessionStore`

Añádelo **después** del método `listByAgent`, antes del cierre `}` de la clase:

```ts
getDisplayMessages(sessionId: string): DisplayMessage[] | null {
  const session = this.db.query("SELECT id FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;

  const rows = this.db.query(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY seq"
  ).all(sessionId) as { role: string; content: string | null }[];

  return rows
    .filter(r => (r.role === "user" || r.role === "assistant") && r.content !== null)
    .map(r => ({
      role: r.role === "assistant" ? "agent" : "user",
      text: r.content!,
    }));
}
```

**Por qué este filtro:**
- `role === "tool"` → resultado de herramienta, no texto legible
- `role === "system"` → prompt del sistema, no mostrar al usuario
- `content === null` → mensaje assistant que solo tiene `tool_calls`, sin texto

---

## Cambio 2 — `server.ts`

### Nueva función handler (añadir después de `handleCreateSession`)

```ts
function handleGetMessages(sessionId: string): Response {
  const messages = sessionStore.getDisplayMessages(sessionId);
  if (messages === null) {
    return new Response("Session not found", { status: 404 });
  }
  return Response.json(messages);
}
```

### Nueva ruta en el `fetch` handler

El servidor usa `if` en cadena para las rutas. Añade este bloque **antes** del `return new Response("Not Found", { status: 404 })` final:

```ts
const messagesMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
if (messagesMatch && req.method === "GET") {
  return handleGetMessages(messagesMatch[1]);
}
```

---

## Respuesta esperada del endpoint

```
GET /api/sessions/abc-123/messages
```

```json
[
  { "role": "user", "text": "¿Cómo hago un loop en Python?" },
  { "role": "agent", "text": "Puedes usar `for` o `while`:\n\n```python\nfor i in range(10):\n    print(i)\n```" },
  { "role": "user", "text": "¿Y con while?" },
  { "role": "agent", "text": "Así:\n\n```python\ni = 0\nwhile i < 10:\n    i += 1\n```" }
]
```

```
GET /api/sessions/no-existe/messages
→ 404 Session not found
```

---

## Criterios de aceptación

- [ ] `GET /api/sessions/:id/messages` devuelve `200` con array JSON para sesión existente
- [ ] Los mensajes `tool` y `system` no aparecen en la respuesta
- [ ] Los mensajes `assistant` sin `content` (solo tool_calls) no aparecen
- [ ] El campo `role` del agente es `"agent"`, no `"assistant"` (conversión en `getDisplayMessages`)
- [ ] `GET /api/sessions/no-existe/messages` devuelve `404`
- [ ] `DisplayMessage` exportado correctamente desde `session-store.ts`
- [ ] Sin errores de TypeScript
- [ ] El diff de `session-store.ts` es solo el tipo nuevo + el método nuevo (< 20 líneas)
- [ ] El diff de `server.ts` es solo la función handler + la ruta (< 10 líneas)

---

## Notas del senior

- El método se llama `getDisplayMessages`, no `getMessages`, para dejar claro que devuelve datos ya transformados para la UI, no el formato interno de LLM.
- El regex `/^\/api\/sessions\/([^/]+)\/messages$/` captura el `sessionId` sin tocar segmentos adicionales del path. No uses `url.pathname.startsWith()` para rutas con parámetros — capturarías cualquier cosa que empiece igual.
- No cambies el método `load()` existente. Ese método devuelve `Message[]` para el agente (protocolo LLM). `getDisplayMessages()` es una vista distinta para la UI. Dos responsabilidades distintas, dos métodos distintos.
- `sessionId` en la URL viene del usuario (vía browser). Está protegido porque usamos SQLite con consultas parametrizadas — no hay inyección SQL. Aun así, el `match[1]` es suficientemente seguro para este caso.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
