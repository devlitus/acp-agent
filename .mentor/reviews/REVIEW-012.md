# REVIEW-012 — Activar tools en el agente Research

**Tarea:** TASK-012  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `"web_search"` en `tools[]` de `research.ts` — nombre exacto con guión bajo ✅
- [x] `"fetch_url"` en `tools[]` de `research.ts` — nombre exacto con guión bajo ✅
- [x] `suggestedPrompts` actualizado con prompts relevantes (no los placeholders originales) — los tres prompts son concretos y accionables; se eliminó `"https://..."`
- [x] `description` del agente actualizada — `"Search the web, read articles, and synthesize information on any topic."`
- [x] `research.md` incluye instrucciones de cuándo usar `web_search` vs `fetch_url` — sección "Web Search Capabilities" con criterios claros
- [x] `research.md` describe el flujo search → fetch → synthesize — pasos 1-4 explícitos
- [x] `research.md` instruye al agente a citar con URLs — `"Always include the URL when referencing specific facts"`
- [x] Solo `research.ts` y `research.md` modificados — sin cambios en otros archivos
- [x] Sin errores de TypeScript — ✅
