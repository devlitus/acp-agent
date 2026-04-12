# REVIEW-006 — Auto-title

**Tarea:** TASK-006  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `setTitleOnFirstMessage` inicializado a `false` — `private setTitleOnFirstMessage = false` en `bridge.ts:148`
- [x] Solo se activa a `true` en el bloque de sesión nueva (no en `existingSessionId`) — dentro del bloque `else` de `if (existingSessionId)`, línea 209
- [x] Se llama a `sessionStore.setTitle()` antes de enviar el prompt — `bridge.ts:252-256`, antes de `this.connection.prompt(...)`
- [x] Se resetea a `false` en `cleanup()` — `bridge.ts:237`
- [x] `sessionStore.setTitle()` no se modifica — método intacto en `session-store.ts:66-69`
- [x] Sin errores de TypeScript — ✅ sin errores
- [x] Diff mínimo: solo las líneas descritas en la tarea — los cambios están acotados a `bridge.ts`
