# REVIEW-011 — fetch-url tool

**Tarea:** TASK-011  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] `try/catch` solo alrededor del `fetch()`, no del método completo — el `try/catch` solo envuelve la llamada a `fetch()`
- [x] Validación de URL (http/https) antes del fetch — comprobación `startsWith("http://")` / `startsWith("https://")`
- [x] Comprobación de `content-type` — rechaza PDFs e imágenes — solo acepta `text/html` y `text/plain`
- [x] `redirect: "follow"` en las opciones del fetch — ✅
- [x] `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` eliminados — regex con backreference `<(script|style)>`, `<(nav|footer|header)>`
- [x] Entidades HTML convertidas (`&nbsp;`, `&amp;`, etc.) — mapa de 6 entidades + `replaceAll` en un bucle
- [x] Truncado a 8.000 chars con mensaje de aviso — ✅
- [x] `extractText` no exportada (función privada del módulo) — `function extractText` sin `export`
- [x] `kind: "read"` (no "execute") — ✅
- [x] `fetchUrlTool` registrado en `index.ts` — ✅
- [x] Sin errores de TypeScript — ✅
- [x] Sin dependencias nuevas en `package.json` — ✅
- [x] Archivo ≤ 75 líneas — **71 líneas** ✅
