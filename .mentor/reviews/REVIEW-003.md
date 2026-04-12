# REVIEW-003 — ActionCard

**Tarea:** TASK-003  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] Spinner animado cuando `status === "running"` — `<span className="animate-spin inline-block">⚙</span>`
- [x] Check verde cuando `done`, X rojo cuando `error` — `text-green-600` / `text-red-600`
- [x] Modo simple: solo una línea visible — sin botón Details cuando `mode !== "advanced"`
- [x] Modo advanced: botón Details + panel colapsable — `useState(false)` para `open`, botón Details ▲/▼
- [x] JSON en `<pre>` con fondo oscuro — `bg-gray-900 text-gray-100` tanto en input como en output
- [x] `StatusIcon` es componente privado (no exportado) — declarado como `function StatusIcon` sin `export`
- [x] Tipo `ToolAction` exportado — `export type ToolAction`
- [x] Archivo ≤ 70 líneas — **59 líneas** ✅
