# REVIEW-007 — GET /api/sessions/:id/messages

**Tarea:** TASK-007  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `getDisplayMessages()` filtra correctamente: solo `user` + `assistant` con `content` no null — `session-store.ts:86`: `.filter((r) => (r.role === "user" || r.role === "assistant") && r.content !== null)`
- [x] `role: "assistant"` se convierte a `"agent"` en el retorno — `session-store.ts:88`: `r.role === "assistant" ? "agent" : "user"`
- [x] Devuelve `null` si la sesión no existe — `session-store.ts:78-80`: consulta previa a `sessions` y retorna `null`
- [x] `DisplayMessage` exportado desde `session-store.ts` — `export type DisplayMessage` en línea 12
- [x] Endpoint responde `200` con array para sesión existente — `server.ts:93-98`: `Response.json(messages)`
- [x] Endpoint responde `404` para sesión inexistente — `server.ts:95-97`: `new Response("Session not found", { status: 404 })`
- [x] Regex de ruta no captura rutas distintas — `/^\/api\/sessions\/([^/]+)\/messages$/` en `server.ts:33`
- [x] Método `load()` existente no modificado — `session-store.ts:29-43` sin cambios
- [x] Sin errores de TypeScript — ✅ sin errores
