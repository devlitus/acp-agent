# Patrones y convenciones del proyecto

> Lee esto antes de implementar cualquier tarea. Es el "cómo hacemos las cosas aquí".

---

## Stack

- **Runtime:** Bun (no Node.js)
- **Frontend:** React 19 + Tailwind CSS 4 + HTML imports nativos de Bun
- **Backend:** `Bun.serve()` (no Express)
- **DB:** `bun:sqlite` (no better-sqlite3)
- **TypeScript** en todo. Cero `any`.

---

## Principios SOLID aplicados aquí

### S — Single Responsibility
Cada archivo tiene una razón para cambiar. Si un componente empieza a hacer dos cosas distintas (ej. gestionar la conexión Y renderizar mensajes), sepáralo.

**Regla práctica:** si un archivo llega a 100 líneas, para y divide.

### O — Open/Closed
Para añadir un tool nuevo → crea el archivo, regístralo en `src/tools/index.ts`. No edites los demás.  
Para añadir un agente nuevo → crea el archivo, regístralo en `src/agents/index.ts`. No edites los demás.

### D — Dependency Inversion
Los componentes de alto nivel (ej. `ChatView`) deben recibir sus dependencias por props, no crearlas internamente. Esto los hace testeables.

---

## Convenciones React

```tsx
// ✅ Funciones nombradas, no arrow functions anónimas
export function ChatView({ agentId, onBack }: ChatViewProps) { ... }

// ✅ Tipos en interfaces separadas arriba del componente
interface ChatViewProps {
  agentId: string;
  onBack: () => void;
}

// ✅ useRef para valores mutables que no deben re-renderizar
const wsRef = useRef<WebSocket | null>(null);

// ❌ NO usar useState para el WebSocket
const [ws, setWs] = useState<WebSocket | null>(null); // mal
```

---

## WebSocket en el browser

```tsx
// Conectar
const ws = new WebSocket(`ws://localhost:3000/ws?agentId=${agentId}`);

// Recibir
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // procesar msg
};

// Enviar
ws.send(JSON.stringify({ type: "prompt", text: "hola" }));

// Cerrar (cleanup en useEffect)
return () => ws.close();
```

---

## Patrones de estado en chat

```tsx
// Tipo para los mensajes de la conversación en la UI
type Message =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; streaming: boolean };

// Tipo para una acción de herramienta
type ToolAction = {
  toolCallId: string;
  title: string;
  status: "running" | "done" | "error";
};
```

---

## Colores Tailwind a usar (consistencia con el Hub)

| Uso | Clase |
|-----|-------|
| Fondo principal | `bg-gray-50` |
| Tarjetas / burbujas blancas | `bg-white` |
| Borde sutil | `border-gray-200` |
| Texto principal | `text-gray-900` |
| Texto secundario | `text-gray-500` |
| Acción primaria (botón enviar) | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| Enlace / back button | `text-indigo-600 hover:text-indigo-700` |
| Error | `text-red-600` |
| Burbuja usuario | `bg-indigo-600 text-white` |
| Burbuja agente | `bg-white border border-gray-200` |

---

## Qué NO hacer

- No uses `express`, `ws`, `socket.io` ni ninguna librería de WebSocket. El browser tiene WebSocket nativo.
- No uses `any`. Si no sabes el tipo, pregunta (deja una nota en la tarea).
- No hagas scroll manual con `setTimeout`. Usa `scrollIntoView` con un `useEffect` que dependa de los mensajes.
- No pongas lógica de negocio en el JSX. Extrae handlers con nombres descriptivos.
- No crees un componente gigante. Si el archivo supera 100 líneas, divide.
