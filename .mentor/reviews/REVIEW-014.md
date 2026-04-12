# REVIEW-014 — Empty state con prompts sugeridos

**Tarea:** TASK-014  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] Empty state visible cuando `messages.length === 0 && status === "ready"` — `showEmptyState = messages.length === 0 && status === "ready"` en `useChatSession.ts:25`
- [x] Empty state NO visible cuando `status === "connecting"` — `status` debe ser `"ready"` para que `showEmptyState` sea `true`
- [x] Prompts vienen de `/api/agents` filtrado por `agentId` (no hardcodeados) — fetch a `/api/agents` con `.find(a => a.id === agentId)` en `useChatSession.ts`
- [x] Click en prompt envía inmediatamente (no solo rellena el input) — `onSelectPrompt={handleSend}` en `ChatView.tsx`
- [x] `handleSend` acepta `overrideText?: string` (refactor correcto) — `function handleSend(overrideText?: string)`
- [x] El `catch` de fetch es silencioso — no loguea al usuario — `.catch(() => {})`
- [x] `EmptyState` no exportado (componente privado del módulo) — función privada `function EmptyState` dentro de `ChatView.tsx`, sin `export`
- [x] `AgentConfig` importado con `import type` — `import type { AgentConfig } from "../../agents/types.ts"` en `useChatSession.ts:6`
- [x] Sin errores de TypeScript — ✅
- [x] `ChatView.tsx` ≤ 180 líneas (incluyendo EmptyState) — **179 líneas** ✅
