# REVIEW-013 — ErrorBoundary

**Tarea:** TASK-013  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `getDerivedStateFromError` es `static` y devuelve el nuevo estado — `static getDerivedStateFromError(error: Error): ErrorBoundaryState`
- [x] `componentDidCatch` loguea a `console.error` (no silenciado) — `console.error("[ErrorBoundary] Caught render error:", ...)`
- [x] `handleReset` como arrow function de clase (no método normal) — `private handleReset = (): void => {...}`
- [x] Pantalla de error: icono + título + descripción + mensaje del error + botón — `⚠️`, `h2`, `p`, mensaje del error, `button` presentes
- [x] Prop `onReset` es opcional (`?`) — `onReset?: () => void`
- [x] `AgentHub` envuelto en `ErrorBoundary` sin `onReset` — `app.tsx`: `<ErrorBoundary>`
- [x] `ChatView` envuelto en `ErrorBoundary` con `onReset={handleBackToHub}` — `app.tsx`: `<ErrorBoundary onReset={handleBackToHub}>`
- [x] Sin errores de TypeScript — ✅
- [x] Archivo ≤ 60 líneas — **58 líneas** ✅
