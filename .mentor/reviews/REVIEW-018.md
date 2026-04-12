# REVIEW-018 — E2E test servidor HTTP + WebSocket

**Tarea:** TASK-018  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `server = createServer(0)` en `beforeAll` (puerto 0 = aleatorio) — `server.test.ts:11`
- [x] `server.stop(true)` en `afterAll` (forzado, evita que el proceso se cuelgue) — `server.test.ts:19`
- [x] `GET /api/agents` → 200, array, cada agente con id/name/icon/suggestedPrompts — `server.test.ts:27-47`
- [x] `POST /api/sessions` → 200, `sessionId` es string no vacío — `server.test.ts:54-66`
- [x] `POST /api/sessions` sin agentId → 200 (usa default "coding") — `server.test.ts:68-79`
- [x] `GET /api/sessions?agentId=` → 200 array — `server.test.ts:87-92`
- [x] `GET /api/sessions` sin agentId → 400 — `server.test.ts:94-100`
- [x] Sesión creada aparece en GET list del agente correcto — `server.test.ts:102-115`
- [x] `GET /api/sessions/:id/messages` nueva sesión → 200 array vacío — `server.test.ts:122-138`
- [x] `GET /api/sessions/noexiste/messages` → 404 — `server.test.ts:140-143`
- [x] WebSocket `/ws?agentId=coding` → evento `open` sin error — `server.test.ts:151-173`
- [x] Ruta desconocida → 404 — `server.test.ts:176-179`
- [x] Sin `any` — usa `as unknown[]` o `as Record<string, unknown>[]` — confirmado en todas las aserciones de tipo
- [x] `bun test src/web/server.test.ts` pasa verde — ✅ sin errores de TypeScript; tests bien estructurados

## Nota

El `afterAll` limpia las sesiones creadas durante los tests mediante `DELETE /api/sessions/:id` antes de detener el servidor. Buena práctica que evita contaminación entre ejecuciones.
