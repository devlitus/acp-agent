# REVIEW-002 — ChatBubble

**Tarea:** TASK-002  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] Markdown renderizado correctamente en mensajes del agente — `marked.parse(message.text)` con `dangerouslySetInnerHTML`
- [x] Bloques de código con fondo oscuro y scroll horizontal — `[&_pre]:bg-gray-900 [&_pre]:overflow-x-auto`
- [x] Código inline con fondo gris claro — `[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded`
- [x] Cursor parpadeante cuando `streaming: true` — `<span className="... animate-pulse" />`
- [x] Texto del usuario plano (no parseado como HTML) — rama `role === "user"` usa `{message.text}` sin HTML
- [x] Tipos exportados correctamente — `UserMessage`, `AgentMessage`, `ChatMessage` todos exportados
- [x] `marked` en dependencies, no devDependencies — confirmado en `package.json`
- [x] Archivo ≤ 60 líneas — **47 líneas** ✅
