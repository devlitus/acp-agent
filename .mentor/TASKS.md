# Mentor Task Board

> Senior: Claude Sonnet 4.6 | Junior: GLM-4.7 (Z.AI)
>
> Comunicación exclusivamente a través de este directorio.
> Lee cada tarea en `tasks/TASK-NNN.md` antes de implementar.
> Cuando termines, cambia el estado de la tarea a `🔵 In Review` y deja notas al final del archivo de tarea.

---

## Flujo de trabajo

1. **Junior** lee `TASKS.md` → encuentra la tarea con estado `🟡 Ready`
2. **Junior** lee el archivo de tarea completo en `tasks/TASK-NNN.md`
3. **Junior** lee `notes/patterns.md` si es la primera tarea
4. **Junior** implementa el código
5. **Junior** actualiza el estado en este archivo a `🔵 In Review` y añade notas al final de la tarea
6. **Senior** revisa, escribe feedback en `reviews/REVIEW-NNN.md`
7. Si hay correcciones → estado `🔴 Changes Requested`, el junior corrige
8. Cuando aprobado → estado `✅ Done`

> **Regla de dependencias**: no empieces una tarea hasta que las que aparecen en "Depende de" estén `✅ Done`.

---

## Phase 4 — Frontend: Chat Interface

| # | Título | Archivo | Depende de | Estado |
|---|--------|---------|------------|--------|
| 001 | ModeToggle — toggle Simple/Advanced | [TASK-001.md](tasks/TASK-001.md) | — | 🟡 Ready |
| 002 | ChatBubble — burbuja de mensaje con markdown | [TASK-002.md](tasks/TASK-002.md) | — | 🟡 Ready |
| 003 | ActionCard — visualización de tool calls | [TASK-003.md](tasks/TASK-003.md) | 001 | ⏸ Blocked |
| 004 | PermissionModal — diálogo de permisos | [TASK-004.md](tasks/TASK-004.md) | — | 🟡 Ready |
| 005 | ChatView — componente principal del chat | [TASK-005.md](tasks/TASK-005.md) | 001 002 003 004 | ⏸ Blocked |

## Phase 5 — Frontend: Session History

| # | Título | Archivo | Depende de | Estado |
|---|--------|---------|------------|--------|
| 006 | Auto-title — título automático de sesión | [TASK-006.md](tasks/TASK-006.md) | Phase 4 ✅ | 🟡 Ready |
| 007 | GET /api/sessions/:id/messages — endpoint de historial | [TASK-007.md](tasks/TASK-007.md) | Phase 4 ✅ | 🟡 Ready |
| 008 | SessionSidebar — panel lateral de sesiones | [TASK-008.md](tasks/TASK-008.md) | 007 | ⏸ Blocked |
| 009 | Integración sidebar en ChatView | [TASK-009.md](tasks/TASK-009.md) | 006 007 008 | ⏸ Blocked |

## Phase 6 — New Tools for Specialized Agents

| # | Título | Archivo | Depende de | Estado |
|---|--------|---------|------------|--------|
| 010 | web-search — búsqueda web con Brave API | [TASK-010.md](tasks/TASK-010.md) | — | 🟡 Ready |
| 011 | fetch-url — extraer texto de una URL | [TASK-011.md](tasks/TASK-011.md) | 010 | ⏸ Blocked |
| 012 | Activar tools en el agente Research | [TASK-012.md](tasks/TASK-012.md) | 010 011 | ⏸ Blocked |

## Phase 7 — Polish & Production Readiness

| # | Título | Archivo | Depende de | Estado |
|---|--------|---------|------------|--------|
| 013 | ErrorBoundary — captura errores de React | [TASK-013.md](tasks/TASK-013.md) | Phase 4 ✅ | 🟡 Ready |
| 014 | Empty state — prompts sugeridos en sesión nueva | [TASK-014.md](tasks/TASK-014.md) | Phase 4 ✅ | 🟡 Ready |
| 015 | Mobile — layout responsive en todos los componentes | [TASK-015.md](tasks/TASK-015.md) | Phase 4+5 ✅ | 🟡 Ready |
| 016 | AGENT_ID validation — error claro al arrancar | [TASK-016.md](tasks/TASK-016.md) | — | 🟡 Ready |
| 017 | README — guía para añadir agentes y tools | [TASK-017.md](tasks/TASK-017.md) | — | 🟡 Ready |
| 018 | E2E test — servidor HTTP + WebSocket | [TASK-018.md](tasks/TASK-018.md) | Phase 4+5 ✅ | 🟡 Ready |

---

## Leyenda de estados

- `🟡 Ready` — Lista para implementar
- `⏸ Blocked` — Esperando que terminen sus dependencias
- `🔵 In Review` — Junior terminó, esperando revisión del senior
- `🔴 Changes Requested` — El senior pidió correcciones
- `✅ Done` — Aprobado
