# REVIEW-004 — PermissionModal

**Tarea:** TASK-004  
**Estado:** ✅ Aprobado

---

## Criterios

- [x] Muestra título de la acción — `<p className="... text-amber-900">{request.title}</p>`
- [x] Un botón por opción con el nombre correcto — `request.options.map(option => <button>{option.name}</button>)`
- [x] Estilos diferenciados: deny (gris), allow_once (borde indigo), allow_always (fondo indigo) — función `buttonClass(kind)` con las tres ramas correctas
- [x] Al pulsar, llama a `onSelect` con `toolCallId` y `optionId` correctos — `onClick={() => onSelect(request.toolCallId, option.id)}`
- [x] Componente sin estado interno — sin ningún `useState`
- [x] Tipo `PermissionRequest` exportado — `export type PermissionRequest`
- [x] Ubicado en el flujo del DOM (no `position: fixed`) — usa `border-t bg-amber-50`, sin clase `fixed`
- [x] Archivo ≤ 50 líneas — **47 líneas** ✅
