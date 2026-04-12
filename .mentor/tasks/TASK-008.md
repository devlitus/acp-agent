# TASK-008 — SessionSidebar

**Estado:** ⏸ Blocked (espera TASK-007)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-007 (necesita el endpoint de sesiones que ya existe: `/api/sessions?agentId=`)  
**Desbloquea:** TASK-009

---

## Objetivo

Crear el componente `SessionSidebar`: un panel lateral colapsable que muestra el historial de sesiones del agente actual. El usuario puede hacer click en una sesión para retomarla.

---

## Archivo a crear

```
src/web/components/SessionSidebar.tsx
```

---

## Interfaz del componente

```tsx
interface Session {
  id: string;
  title: string | null;
  updated_at: number;   // timestamp en milisegundos (Unix)
}

interface SessionSidebarProps {
  agentId: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onClose: () => void;
}

export function SessionSidebar({ agentId, currentSessionId, onSelectSession, onClose }: SessionSidebarProps) { ... }
```

> El tipo `Session` coincide con lo que devuelve `GET /api/sessions?agentId=` (ya existente desde Phase 3).

---

## Comportamiento

- Al montar, hace `fetch("/api/sessions?agentId={agentId}")` para obtener las sesiones
- Muestra una lista de sesiones ordenadas por `updated_at` (más reciente primero — el servidor ya las ordena así)
- La sesión con `id === currentSessionId` aparece resaltada
- Al hacer click en una sesión, llama a `onSelectSession(session.id)`
- El botón "×" o "Cerrar" llama a `onClose()`

---

## Layout

El sidebar se renderiza como un panel lateral fijo a la izquierda dentro del contenedor de `ChatView`. **No uses `position: fixed`** — el padre (`ChatView`) lo colocará en el flujo con flexbox.

```
┌──────────────────┬──────────────────────────────────┐
│ Historial    [×] │                                  │
│──────────────────│        área de mensajes          │
│ ● Esta sesión    │                                  │
│   hace 2 min     │                                  │
│──────────────────│                                  │
│   Otra sesión    │                                  │
│   hace 1h        │                                  │
│──────────────────│                                  │
│   Sesión antigua │                                  │
│   hace 3d        │                                  │
└──────────────────┴──────────────────────────────────┘
```

```tsx
<aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
  {/* Header del sidebar */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
    <h2 className="text-sm font-semibold text-gray-700">Historial</h2>
    <button
      onClick={onClose}
      className="text-gray-400 hover:text-gray-600 text-lg leading-none"
      aria-label="Cerrar historial"
    >
      ×
    </button>
  </div>

  {/* Lista de sesiones */}
  <nav className="flex-1 overflow-y-auto py-2">
    {sessions.map(session => (
      <SessionItem
        key={session.id}
        session={session}
        isActive={session.id === currentSessionId}
        onSelect={() => onSelectSession(session.id)}
      />
    ))}
  </nav>
</aside>
```

---

## Sub-componente privado `SessionItem`

Define este componente **en el mismo archivo** (no exportarlo):

```tsx
interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
}

function SessionItem({ session, isActive, onSelect }: SessionItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isActive ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
      }`}
    >
      <p className="text-sm font-medium text-gray-900 truncate">
        {session.title || "Sin título"}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {formatRelativeTime(session.updated_at)}
      </p>
    </button>
  );
}
```

---

## Función `formatRelativeTime`

Cópiala de `AgentHub.tsx` — ya existe y hace exactamente lo que necesitas. Ponla en el mismo archivo como función privada (no exportarla):

```ts
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return new Date(timestamp).toLocaleDateString();
}
```

> En una refactorización futura, esto podría moverse a `src/web/utils.ts`. Por ahora la duplicación es aceptable — no abstraigas antes de tiempo.

---

## Estados de carga

```tsx
const [sessions, setSessions] = useState<Session[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/sessions?agentId=${agentId}`)
    .then(r => r.json())
    .then(data => setSessions(data))
    .catch(err => console.error("Failed to load sessions:", err))
    .finally(() => setLoading(false));
}, [agentId]);
```

Si `loading` es `true`, muestra:
```tsx
<p className="px-4 py-3 text-sm text-gray-400">Cargando...</p>
```

Si `sessions.length === 0` y no loading:
```tsx
<p className="px-4 py-3 text-sm text-gray-400 italic">Sin sesiones anteriores</p>
```

---

## Criterios de aceptación

- [ ] El panel muestra las sesiones del agente actual al montarse
- [ ] Cada sesión muestra su título (o "Sin título" si es null) y tiempo relativo
- [ ] La sesión activa aparece resaltada con borde izquierdo indigo y fondo indigo-50
- [ ] Al hacer click en una sesión, llama a `onSelectSession(id)`
- [ ] El botón "×" llama a `onClose()`
- [ ] Estado de carga visible mientras fetch está en curso
- [ ] Estado vacío visible si no hay sesiones
- [ ] `SessionItem` no está exportado (componente privado del sidebar)
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 90 líneas

---

## Notas del senior

- `w-64` es 16rem (~256px). Es un ancho estándar para sidebars. No lo hagas configurable — no hay necesidad.
- El `useEffect` tiene `[agentId]` como dependencia. Si el usuario cambia de agente (hipotéticamente), el sidebar recarga las sesiones de ese agente. Correcto.
- No refresques automáticamente la lista cuando se crea una sesión nueva — eso requeriría lógica de polling o callbacks adicionales. Si el usuario quiere ver la nueva sesión, puede cerrar y abrir el sidebar. Eso es Phase 6, no ahora.
- `SessionItem` es un componente privado. No lo exportes. Solo `SessionSidebar` lo usa y están en el mismo archivo. Cuando tenga más de un consumidor, lo movemos a su propio archivo.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
