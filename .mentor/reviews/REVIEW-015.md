# REVIEW-015 — Mobile-responsive layout

**Tarea:** TASK-015  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] Sidebar usa `fixed` en móvil y `relative` en sm+ — `SessionSidebar.tsx:42`: `fixed top-0 left-0 h-full z-50 w-72 sm:relative sm:top-auto sm:left-auto sm:h-full sm:z-auto sm:w-64`
- [x] Backdrop (`fixed inset-0 bg-black/30`) con `sm:hidden` — `ChatView.tsx:93`: `className="fixed inset-0 bg-black/30 z-40 sm:hidden"`
- [x] Click en backdrop cierra el sidebar — `onClick={() => setSidebarOpen(false)}` en `ChatView.tsx:94`
- [x] Header: "Back" y "Historial" ocultos en móvil (`hidden sm:inline`) — `ChatView.tsx:69` y `ChatView.tsx:84`
- [x] Burbujas: `max-w-[85%]` móvil, `sm:max-w-[75%]` escritorio — `ChatBubble.tsx:24` y `ChatBubble.tsx:35`
- [x] No hay scroll horizontal en 375px — no hay elementos con ancho fijo que desborden; `overflow-hidden` y `overflow-x-auto` en los `pre` de código
- [x] `AgentHub.tsx` y `AgentCard.tsx` sin modificar — no aparecen en los cambios de estas tareas
- [x] Sin errores de TypeScript — ✅ sin errores
