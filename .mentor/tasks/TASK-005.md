# TASK-005 — ChatView

**Estado:** ⏸ Blocked (espera TASK-001, 002, 003, 004)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-001, TASK-002, TASK-003, TASK-004  
**Desbloquea:** —

---

## Objetivo

Crear el componente principal `ChatView` que integra todos los componentes de Phase 4. Es el único componente con lógica de WebSocket. Gestiona el estado completo de la conversación y coordina `ChatBubble`, `ActionCard`, `PermissionModal` y `ModeToggle`.

---

## Archivos a crear/modificar

```
src/web/components/ChatView.tsx   ← CREAR
src/web/app.tsx                   ← MODIFICAR (reemplazar el placeholder)
```

---

## Interfaz del componente

```tsx
interface ChatViewProps {
  agentId: string;
  sessionId: string | null;  // null = nueva sesión
  onBack: () => void;
}

export function ChatView({ agentId, sessionId, onBack }: ChatViewProps) { ... }
```

---

## Estado del componente

```tsx
// Importa los tipos de los otros componentes
import type { ChatMessage } from "./ChatBubble.tsx";
import type { ToolAction } from "./ActionCard.tsx";
import type { PermissionRequest } from "./PermissionModal.tsx";

// Estado interno de ChatView
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [actions, setActions] = useState<Map<string, ToolAction>>(new Map());
const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
const [status, setStatus] = useState<"connecting" | "ready" | "thinking" | "error">("connecting");
const [inputText, setInputText] = useState("");

// Refs (no son estado, no provocan re-render)
const wsRef = useRef<WebSocket | null>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);  // para scroll automático

// Hook del modo (de TASK-001)
const [mode, setMode] = useMode();
```

> `actions` usa `Map` porque necesitas actualizar tool calls individuales por `toolCallId`. Un array requeriría `find` en cada actualización.

---

## Conexión WebSocket

```tsx
useEffect(() => {
  const params = new URLSearchParams({ agentId });
  if (sessionId) params.set("sessionId", sessionId);

  const ws = new WebSocket(`ws://localhost:3000/ws?${params}`);
  wsRef.current = ws;

  ws.onopen = () => setStatus("ready");
  ws.onclose = () => setStatus("error");
  ws.onerror = () => setStatus("error");
  ws.onmessage = (event) => handleServerMessage(JSON.parse(event.data));

  return () => ws.close();  // cleanup al desmontar
}, [agentId, sessionId]);
```

---

## Manejador de mensajes del servidor

Implementa esta función dentro del componente. Cada `type` del protocolo tiene un caso:

```tsx
function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "chunk":
      // Acumula en el último mensaje agent, o crea uno nuevo
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "agent") {
          // actualiza el texto del último mensaje
          return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
        }
        // crea nuevo mensaje agent en streaming
        return [...prev, { role: "agent", text: msg.text, streaming: true }];
      });
      break;

    case "action":
      setActions(prev => {
        const next = new Map(prev);
        next.set(msg.toolCallId, {
          toolCallId: msg.toolCallId,
          title: msg.title,
          status: msg.status,
        });
        return next;
      });
      break;

    case "action_detail":
      setActions(prev => {
        const next = new Map(prev);
        const existing = next.get(msg.toolCallId);
        if (existing) {
          next.set(msg.toolCallId, { ...existing, input: msg.input, output: msg.output });
        }
        return next;
      });
      break;

    case "permission":
      setPendingPermission({
        toolCallId: msg.toolCallId,
        title: msg.title,
        options: msg.options,
      });
      break;

    case "done":
      setStatus("ready");
      // Marca el último mensaje agent como ya no streaming
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "agent") {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return prev;
      });
      break;

    case "error":
      setStatus("error");
      break;
  }
}
```

Define el tipo `ServerMessage` en el mismo archivo copiándolo de `bridge.ts` (es el tipo de los mensajes que recibe el cliente):

```tsx
type ServerMessage =
  | { type: "chunk"; text: string }
  | { type: "action"; toolCallId: string; title: string; status: "running" | "done" | "error" }
  | { type: "action_detail"; toolCallId: string; input: unknown; output: string }
  | { type: "permission"; toolCallId: string; title: string; options: { id: string; name: string; kind: string }[] }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string };
```

---

## Handlers de acciones del usuario

```tsx
function handleSend() {
  if (!inputText.trim() || status !== "ready") return;

  // Añade el mensaje del usuario a la lista
  setMessages(prev => [...prev, { role: "user", text: inputText }]);
  setStatus("thinking");

  // Envía al servidor
  wsRef.current?.send(JSON.stringify({ type: "prompt", text: inputText }));
  setInputText("");
}

function handleCancel() {
  wsRef.current?.send(JSON.stringify({ type: "cancel" }));
  setStatus("ready");
}

function handlePermissionSelect(toolCallId: string, optionId: string) {
  wsRef.current?.send(JSON.stringify({ type: "permission", toolCallId, optionId }));
  setPendingPermission(null);
}
```

---

## Scroll automático

```tsx
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

---

## Layout del render

```
┌─────────────────────────────────────┐
│ ← Back    Coding Assistant    Simple│Advanced │   ← header
├─────────────────────────────────────┤
│                                     │
│  [mensajes y acciones]              │   ← área scrollable
│                                     │
│  <div ref={messagesEndRef} />       │   ← ancla de scroll
├─────────────────────────────────────┤
│ [PermissionModal si hay permiso]    │   ← condicional
├─────────────────────────────────────┤
│  [input text]            [Send/Stop]│   ← barra de input
└─────────────────────────────────────┘
```

```tsx
return (
  <div className="flex flex-col h-screen bg-gray-50">
    {/* Header */}
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
      <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
        ← Back
      </button>
      <span className="font-semibold text-gray-900">{agentId}</span>
      <ModeToggle mode={mode} onChange={setMode} />
    </header>

    {/* Área de mensajes */}
    <main className="flex-1 overflow-y-auto px-4 py-4">
      {/* Mensajes: cada ChatMessage + acciones intercaladas */}
      {messages.map((msg, i) => (
        <ChatBubble key={i} message={msg} />
      ))}
      {/* Acciones (tool calls) — mostrar después del último mensaje del agente */}
      {[...actions.values()].map(action => (
        <ActionCard key={action.toolCallId} action={action} mode={mode} />
      ))}
      <div ref={messagesEndRef} />
    </main>

    {/* Permission modal (si hay) */}
    {pendingPermission && (
      <PermissionModal request={pendingPermission} onSelect={handlePermissionSelect} />
    )}

    {/* Input bar */}
    <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={status === "thinking" || status === "connecting" || !!pendingPermission}
          placeholder={status === "connecting" ? "Connecting..." : "Type a message..."}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {status === "thinking" ? (
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || status !== "ready"}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </footer>
  </div>
);
```

---

## Modificación de app.tsx

Reemplaza las líneas 40-63 de `app.tsx` (el bloque con el placeholder 🚧) con:

```tsx
return (
  <ChatView
    agentId={selectedAgentId!}
    sessionId={selectedSessionId}
    onBack={handleBackToHub}
  />
);
```

Añade el import al inicio del archivo:

```tsx
import { ChatView } from "./components/ChatView.tsx";
```

Elimina también el `<header>` y el `<main>` del placeholder — ChatView incluye su propio layout.

---

## Criterios de aceptación

- [ ] Hub → "Start Chat" → abre ChatView sin errores en consola
- [ ] Hub → click en sesión reciente → abre ChatView en esa sesión
- [ ] Escribir un mensaje + Enter → aparece en la UI alineado a la derecha
- [ ] El agente responde en streaming → texto aparece progresivamente
- [ ] Cuando el agente usa una herramienta → aparece ActionCard con estado running/done/error
- [ ] Modo Simple: ActionCard muestra solo una línea
- [ ] Modo Advanced: ActionCard muestra botón Details + JSON expandible
- [ ] Cambiar modo con ModeToggle → se persiste al recargar
- [ ] Si el agente pide permiso → aparece PermissionModal, el input se bloquea
- [ ] Al responder permiso → modal desaparece, input se desbloquea
- [ ] Botón Stop visible durante "thinking", botón Send visible cuando "ready"
- [ ] Botón "← Back" cierra el WebSocket y vuelve al Hub
- [ ] Scroll automático al nuevo contenido
- [ ] Sin errores de TypeScript (`bun run tsc --noEmit`)

---

## Notas del senior

- **`Map` para actions, no array.** Cuando el servidor envía `action_detail` para actualizar una acción existente, con `Map` es `O(1)`. Con array sería un `find` + `map`.
- **El `useEffect` del WebSocket tiene `[agentId, sessionId]` como dependencias.** Si el usuario navega a otro agente, el efecto se limpia y reconecta. Correcto.
- **No uses `index` del array como `key` en los mensajes** si los mensajes pueden reordenarse. Aquí solo se añaden al final, así que es aceptable por ahora.
- **El render mezcla mensajes y acciones en el mismo flujo.** En esta versión simplificada, las acciones aparecen después de todos los mensajes. No te preocupes por intercalarlos en el orden exacto del timeline — eso es Phase 5.
- Si `ChatView.tsx` supera 150 líneas, extrae los handlers en un custom hook `useChatSession`. Pero intenta primero que quepa en un archivo razonable.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
