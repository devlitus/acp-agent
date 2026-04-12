# REVIEW-016 — AGENT_ID validation

**Tarea:** TASK-016  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `agentRegistry.validate()` llamado antes del try/catch principal — `agent/index.ts:24-30`, bloque `try/catch` de `validate()` está antes del bloque principal en línea 41
- [x] Error de `validate()` muestra mensaje descriptivo sobre tool names — `agent/index.ts:27-29`: mensaje con `Check that all tool names in src/agents/*.ts exist in src/tools/index.ts`
- [x] Error de `get()` muestra el ID inválido + lista de IDs válidos — `agent/index.ts:46-51`: incluye el mensaje de error del `get()` y la lista de IDs válidos
- [x] Mensaje incluye ejemplo de uso con `AGENT_ID=coding` — `agent/index.ts:51`: `Example: AGENT_ID=coding bun run src/agent/index.ts`
- [x] `process.exit(1)` en ambos casos de error — `agent/index.ts:29` y `agent/index.ts:52`
- [x] Declaraciones `let` fuera del `try/catch` con tipos correctos — `let agentConfig: AgentConfig`, `let systemPrompt: string`, `let tools: ReturnType<...>` en `agent/index.ts:37-39`
- [x] Happy path no imprime nada adicional — sin `console.log` extra en el flujo normal
- [x] Sin errores de TypeScript — ✅ sin errores
