# REVIEW-017 — README actualizado

**Tarea:** TASK-017  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] No referencia `src/agent.ts` ni `src/client.ts` (no existen) — el README referencia `src/agent/agent.ts` y `src/client/client.ts` con las rutas correctas
- [x] "How to add a new agent" tiene exactamente 3 pasos numerados con código — pasos 1 (crear config), 2 (escribir prompt .md), 3 (registrar en index.ts), todos con bloques de código
- [x] "How to add a new tool" tiene exactamente 3 pasos numerados con código — pasos 1 (crear tool), 2 (registrar en index.ts), 3 (conceder acceso en el agente), todos con bloques de código
- [x] Tabla de env vars incluye `BRAVE_API_KEY` — fila `BRAVE_API_KEY` presente con descripción
- [x] Scripts `bun run server`, `bun run client` coinciden con `package.json` — ambos scripts existen en `package.json` con los mismos nombres
- [x] Estructura del proyecto refleja el estado real (incluye todos los componentes de Phase 4-6) — incluye `web/`, `hooks/`, todos los componentes React, `EmptyState.tsx`, `ErrorBoundary.tsx`
- [x] Markdown válido sin sintaxis rota — bloques de código correctamente cerrados, encabezados coherentes
- [x] Test mental: ¿puede alguien nuevo añadir un agente siguiendo solo los 3 pasos? — sí: los 3 pasos son autocontenidos, con código copiable y la nota de herramienta disponibles
