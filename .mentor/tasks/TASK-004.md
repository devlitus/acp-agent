# TASK-004 — PermissionModal

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** —  
**Desbloquea:** TASK-005

---

## Objetivo

Crear el componente `PermissionModal` que se muestra cuando el agente necesita permiso del usuario para ejecutar una acción. El modal bloquea la interacción con el chat hasta que el usuario responda.

Ejemplo del ROADMAP:
```
⚠️ The agent wants to run a command
> npm install express
[Deny]  [Allow once]  [Always allow]
```

---

## Archivo a crear

```
src/web/components/PermissionModal.tsx
```

---

## Tipos (define en el archivo, los usará ChatView)

```tsx
export type PermissionRequest = {
  toolCallId: string;
  title: string;
  options: {
    id: string;
    name: string;
    kind: string;
  }[];
};
```

Este tipo coincide exactamente con el mensaje `permission` del protocolo WebSocket en `bridge.ts`.

---

## Interfaz del componente

```tsx
interface PermissionModalProps {
  request: PermissionRequest;
  onSelect: (toolCallId: string, optionId: string) => void;
}

export function PermissionModal({ request, onSelect }: PermissionModalProps) { ... }
```

---

## Comportamiento

- Se renderiza como un **banner fijo en la parte inferior** del área de chat (justo encima del input), no como un modal flotante centrado. Esto facilita la lectura del contexto.
- Muestra el título de la acción que pide permiso.
- Muestra un botón por cada opción recibida.
- Al pulsar un botón, llama a `onSelect(request.toolCallId, option.id)` y el padre cerrará el modal quitando el `request` del estado.

---

## Apariencia

```
┌─────────────────────────────────────────────────────┐
│ ⚠️  The agent wants to run a command                 │
│                                                     │
│         [ Deny ]  [ Allow once ]  [ Always allow ]  │
└─────────────────────────────────────────────────────┘
```

Implementación sugerida:

```tsx
<div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
  <div className="flex items-start gap-3 mb-3">
    <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
    <p className="text-sm font-medium text-amber-900">{request.title}</p>
  </div>
  <div className="flex gap-2 justify-end">
    {request.options.map((option) => (
      <button
        key={option.id}
        onClick={() => onSelect(request.toolCallId, option.id)}
        className={buttonClass(option.kind)}
      >
        {option.name}
      </button>
    ))}
  </div>
</div>
```

---

## Estilos de botones según `option.kind`

Los `kind` posibles vienen del protocolo ACP. Usa esta función helper en el archivo:

```tsx
function buttonClass(kind: string): string {
  if (kind === "deny") {
    return "px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100";
  }
  if (kind === "allow_always") {
    return "px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700";
  }
  // allow_once y cualquier otro
  return "px-3 py-1.5 text-sm rounded-lg bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50";
}
```

---

## Cómo lo usará ChatView

`ChatView` tendrá un estado `pendingPermission: PermissionRequest | null`. Cuando llegue un mensaje `permission` del WebSocket, lo setea. Cuando el usuario responde, lo limpia.

```tsx
// En ChatView
{pendingPermission && (
  <PermissionModal
    request={pendingPermission}
    onSelect={handlePermissionSelect}
  />
)}
```

El `PermissionModal` en sí no gestiona ningún estado — es puro presentational.

---

## Criterios de aceptación

- [ ] Muestra el título de la acción
- [ ] Muestra un botón por cada opción recibida con el nombre correcto
- [ ] Al pulsar un botón, llama a `onSelect` con los parámetros correctos
- [ ] Botón "Deny" con estilo neutro (borde gris)
- [ ] Botón "Allow once" con estilo secundario (borde indigo)
- [ ] Botón "Always allow" con estilo primario (fondo indigo)
- [ ] El componente no tiene estado interno
- [ ] Tipo `PermissionRequest` exportado
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 50 líneas

---

## Notas del senior

- Este es el componente más sencillo de Phase 4 junto con `ModeToggle`. Sin estado, sin lógica, solo presenta datos y emite eventos.
- No centres el modal en la pantalla con `position: fixed`. Colócalo en el flujo normal del DOM, entre la lista de mensajes y el input. Así el usuario ve el contexto de la conversación mientras decide.
- La función `buttonClass` es un helper de estilos, no un componente React. No empieces su nombre con mayúscula.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
