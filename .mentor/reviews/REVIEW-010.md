# REVIEW-010 — web-search tool

**Tarea:** TASK-010  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `BRAVE_API_KEY` exportado desde `config.ts` — `export const BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? ""`
- [x] Guarda vacío `""` como default (no `undefined`, no lanza en startup) — `?? ""` en `config.ts:14`
- [x] Comprobación de API key al inicio de `execute()` con mensaje claro — mensaje descriptivo con instrucción para configurar la variable
- [x] `count` clampado a `[1, 10]` — `Math.min(10, Math.max(1, ...))`
- [x] Errores HTTP devuelven string (no excepción) — `return \`Search API error: ${response.status}...\``
- [x] Formato de resultados numerado: título + URL + descripción — `.map((r, i) => \`${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}\`)`
- [x] `kind: "read"` — ✅
- [x] `_ctx` con prefijo `_` (no se usa) — `_ctx: ToolContext` ✅
- [x] `webSearchTool` registrado en `index.ts` — ✅
- [x] Sin errores de TypeScript — ✅
- [x] Archivo ≤ 65 líneas — **64 líneas** ✅ (tipo `BraveResult` huérfano eliminado)
