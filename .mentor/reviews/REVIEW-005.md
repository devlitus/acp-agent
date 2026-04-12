# REVIEW-005 — ChatView

**Tarea:** TASK-005  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] WebSocket en `useRef`, no en `useState` — `wsRef = useRef<WebSocket | null>(null)` en `useChatSession.ts:22`
- [x] Chunks acumulados en el mismo mensaje agent (no un mensaje nuevo por chunk) — `useChatSession.ts:80-86`: si el último mensaje es `agent`, concatena; si no, crea uno nuevo
- [x] `actions` usa `Map`, no array — `useState<Map<string, ToolAction>>(new Map())` en `useChatSession.ts:17`
- [x] Cleanup del WebSocket en el unmount (`return () => ws.close()`) — `useChatSession.ts:74`
- [x] Scroll automático al nuevo contenido — `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })` en `useChatSession.ts:139`
- [x] Input bloqueado durante `thinking` y cuando hay `pendingPermission` — `disabled={status === "thinking" || status === "connecting" || !!pendingPermission}` en `ChatView.tsx:143`
- [x] Botón Stop durante thinking, botón Send cuando ready — `ChatView.tsx:147-162`
- [x] `ServerMessage` tipado completamente (sin `any`) — tipo discriminado completo en `useChatSession.ts:7-13`
- [x] Placeholder eliminado de `app.tsx` — `app.tsx` no tiene placeholders, monta `AgentHub` y `ChatView` directamente
- [x] `tsc --noEmit` sin errores — ✅ sin errores

## Nota

La lógica fue extraída a `src/web/hooks/useChatSession.ts`. Decisión correcta — supera el criterio mínimo pedido.
