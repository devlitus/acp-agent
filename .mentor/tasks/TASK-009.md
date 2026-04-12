# TASK-009 — Integración sidebar en ChatView

**Estado:** ⏸ Blocked (espera TASK-006, 007, 008)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-006, TASK-007, TASK-008  
**Desbloquea:** —

---

## Objetivo

Integrar `SessionSidebar` dentro de `ChatView` y conectar la carga del historial de mensajes cuando se abre una sesión existente. Al terminar esta tarea, Phase 5 estará completa.

---

## Archivos a modificar

```
src/web/components/ChatView.tsx   ← añadir sidebar + carga de historial
src/web/app.tsx                   ← añadir prop onSwitchSession
```

---

## Cambio 1 — `app.tsx`: nuevo prop y handler

### Nuevo handler en `App`

```tsx
function handleSwitchSession(sessionId: string) {
  setSelectedSessionId(sessionId);
  // agentId no cambia — el sidebar filtra por el agente actual
}
```

### Pasar el handler a `ChatView`

```tsx
<ChatView
  agentId={selectedAgentId!}
  sessionId={selectedSessionId}
  onBack={handleBackToHub}
  onSwitchSession={handleSwitchSession}   // ← añadir
/>
```

---

## Cambio 2 — `ChatView.tsx`

### Actualizar la interfaz del componente

```tsx
interface ChatViewProps {
  agentId: string;
  sessionId: string | null;
  onBack: () => void;
  onSwitchSession: (sessionId: string) => void;   // ← añadir
}
```

### Nuevo estado para el sidebar

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

### Carga del historial al abrir sesión existente

Añade un `useEffect` que se ejecuta cuando `sessionId` no es null y carga los mensajes:

```tsx
useEffect(() => {
  if (!sessionId) return;   // sesión nueva, sin historial que cargar

  fetch(`/api/sessions/${sessionId}/messages`)
    .then(r => r.json())
    .then((data: DisplayMessage[]) => {
      // Convertir DisplayMessage[] → ChatMessage[]
      const history: ChatMessage[] = data.map(m => ({
        role: m.role,
        text: m.text,
        ...(m.role === "agent" ? { streaming: false } : {}),
      }));
      setMessages(history);
    })
    .catch(err => console.error("Failed to load history:", err));
}, [sessionId]);
```

Añade el import del tipo:
```tsx
import type { DisplayMessage } from "../../agent/session-store.ts";
```

### Añadir botón de historial al header

En el `<header>` de `ChatView`, añade un botón entre el título del agente y el `ModeToggle`:

```tsx
<button
  onClick={() => setSidebarOpen(o => !o)}
  className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
  title="Ver historial"
>
  🕐 Historial
</button>
```

### Actualizar el layout para incluir el sidebar

El layout actual de `ChatView` es:
```
flex flex-col h-screen
  header
  main (flex-1 overflow-y-auto)
  PermissionModal (condicional)
  footer
```

Cámbialo para que el `<main>` contenga el sidebar y el área de mensajes lado a lado:

```tsx
{/* Área principal: sidebar + mensajes */}
<div className="flex flex-1 overflow-hidden">
  {/* Sidebar (condicional) */}
  {sidebarOpen && (
    <SessionSidebar
      agentId={agentId}
      currentSessionId={sessionId}
      onSelectSession={(id) => {
        onSwitchSession(id);
        setSidebarOpen(false);
      }}
      onClose={() => setSidebarOpen(false)}
    />
  )}

  {/* Mensajes */}
  <main className="flex-1 overflow-y-auto px-4 py-4">
    {messages.map((msg, i) => (
      <ChatBubble key={i} message={msg} />
    ))}
    {[...actions.values()].map(action => (
      <ActionCard key={action.toolCallId} action={action} mode={mode} />
    ))}
    <div ref={messagesEndRef} />
  </main>
</div>
```

> El contenedor `flex flex-1 overflow-hidden` evita que el sidebar empuje el footer fuera de la pantalla.

### Añadir el import de `SessionSidebar`

```tsx
import { SessionSidebar } from "./SessionSidebar.tsx";
```

### Limpiar mensajes al cambiar de sesión

Cuando `sessionId` cambia (el usuario selecciona otra sesión desde el sidebar), el `useEffect` del WebSocket se reconecta. Pero los mensajes anteriores siguen en el estado. Limpia el estado al inicio del efecto del WebSocket:

```tsx
useEffect(() => {
  setMessages([]);   // ← limpiar al cambiar de sesión
  setActions(new Map());
  setPendingPermission(null);
  setStatus("connecting");

  const params = new URLSearchParams({ agentId });
  if (sessionId) params.set("sessionId", sessionId);
  // ...resto igual
}, [agentId, sessionId]);
```

---

## Flujo completo tras los cambios

```
Usuario en AgentHub → click "Retomar sesión X"
  → app.tsx: setSelectedSessionId("X"), setCurrentView("chat")
  → ChatView monta con sessionId="X"
  → useEffect WebSocket: limpia estado, conecta con sessionId="X"
  → useEffect historial: fetch /api/sessions/X/messages, setMessages(history)
  → UI muestra historial previo
  → Usuario puede continuar la conversación

Usuario en ChatView → click "Historial"
  → sidebarOpen = true, SessionSidebar aparece
  → Usuario hace click en sesión "Y"
  → onSwitchSession("Y") → app.tsx: setSelectedSessionId("Y")
  → ChatView recibe nuevo sessionId="Y" por props
  → ambos useEffects se re-ejecutan → reconecta, carga historial de Y
  → sidebar se cierra automáticamente
```

---

## Criterios de aceptación

- [ ] Al abrir una sesión existente desde AgentHub, los mensajes previos aparecen en el chat
- [ ] Los mensajes del historial se muestran correctamente (usuario a derecha, agente a izquierda con markdown)
- [ ] Botón "Historial" en el header abre/cierra el sidebar
- [ ] El sidebar muestra las sesiones del agente actual
- [ ] Hacer click en una sesión del sidebar: carga esa sesión y cierra el sidebar
- [ ] Al cambiar de sesión, el área de mensajes se limpia antes de mostrar el nuevo historial
- [ ] El footer y el header permanecen visibles cuando el sidebar está abierto
- [ ] El input de texto no se ve afectado por el sidebar
- [ ] Sin errores de TypeScript (`bun run tsc --noEmit`)
- [ ] Ambas props nuevas (`onSwitchSession` en ChatViewProps, handler en App) están correctamente tipadas

---

## Notas del senior

- El `useEffect` de historial tiene `[sessionId]` como dependencia. El de WebSocket tiene `[agentId, sessionId]`. Ambos se ejecutan cuando `sessionId` cambia — el orden importa. React los ejecuta en el orden que aparecen en el componente. El WebSocket debe aparecer **antes** que el historial, porque primero queremos conectar y luego pintar la historia. Si el orden fuera inverso, el usuario vería el historial un instante antes de que el WebSocket esté listo.
- `overflow-hidden` en el contenedor del sidebar es crítico. Sin él, el sidebar haría que el layout crezca más allá de la altura de la pantalla y el footer quedaría fuera.
- Al seleccionar una sesión del sidebar, llamamos a `onSwitchSession(id)` y luego `setSidebarOpen(false)`. El sidebar se cierra inmediatamente mientras el nuevo sessionId se propaga y el WebSocket reconecta. El usuario ve la transición limpia.
- `DisplayMessage` se importa de `session-store.ts`. Es un import cruzado backend→frontend que en este proyecto es aceptable porque comparten el mismo repositorio. En un proyecto más grande, este tipo estaría en un paquete compartido.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
