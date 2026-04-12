# Fixes pendientes tras revisión de criterios

Resultado de contrastar el código actual con los criterios de `.mentor/reviews/`.
Cada sección indica exactamente qué cambiar y por qué.

---

## FIX-1 — Orden de `useEffect` en `useChatSession.ts` (REVIEW-009)

**Archivo:** `src/web/hooks/useChatSession.ts`

**Criterio incumplido:**
> `useEffect` de WS aparece antes que el de historial en el código.

**Estado actual:** el `useEffect` del historial está en la línea 39 y el del WebSocket en la línea 57.
El criterio exige el orden inverso: primero WS, luego historial.

**Cómo solucionarlo:**

Intercambiar el bloque del WebSocket con el del historial. El orden resultante en el archivo debe ser:

```
1. useEffect — prompts sugeridos   (no cambia de sitio)
2. useEffect — WebSocket           ← sube aquí
3. useEffect — historial           ← baja aquí
4. useEffect — auto-scroll         (no cambia de sitio)
```

El `useEffect` del WebSocket (el que hace `setMessages([])` y abre la conexión) debe declararse
inmediatamente después del de prompts sugeridos. El de historial va justo después del de WebSocket.

> **Por qué importa:** el orden refleja la intención de diseño — el WS es la operación "maestra"
> que resetea el estado; el historial es una carga secundaria. Además, si en el futuro se añade
> lógica síncrona dentro del efecto del WS, el orden incorrecto podría provocar que el historial
> se cargue y luego se borre visiblemente.

---

## FIX-2 — Placeholder URL en `suggestedPrompts` de `research.ts` (REVIEW-012)

**Archivo:** `src/agents/research.ts`

**Criterio incumplido:**
> `suggestedPrompts` actualizado con prompts relevantes (no los placeholders originales).

**Estado actual:**
```ts
suggestedPrompts: [
  "Search for the latest news on AI regulation in Europe",
  "What are the best practices for TypeScript in 2025?",
  "Fetch and summarize this article: https://...",   // ← placeholder
],
```

**Cómo solucionarlo:**

Reemplazar la tercera entrada con un prompt concreto y accionable. Ejemplo:

```ts
"Summarize the key findings of the 2024 State of JS survey",
```

O cualquier otro prompt específico que un usuario real pudiera enviar al agente de investigación.
El texto `https://...` no es un prompt válido — no puede ejecutarse sin que el usuario lo edite.

---

## FIX-3 — `EmptyState` exportado desde su propio archivo (REVIEW-014)

**Archivos:** `src/web/components/EmptyState.tsx` y `src/web/components/ChatView.tsx`

**Criterio incumplido:**
> `EmptyState` no exportado (componente privado del módulo).

**Estado actual:** `EmptyState` vive en `src/web/components/EmptyState.tsx` con `export function EmptyState`.

**Cómo solucionarlo:**

Mover el contenido de `EmptyState.tsx` directamente a `ChatView.tsx` como función **sin exportar**,
y eliminar el archivo `EmptyState.tsx`.

Dentro de `ChatView.tsx`, antes del componente `ChatView`:

```tsx
// Privado — no exportar
function EmptyState({ agentId, suggestedPrompts, onSelectPrompt }: {
  agentId: string;
  suggestedPrompts: string[];
  onSelectPrompt: (prompt: string) => void;
}) {
  // ... mismo JSX que tiene EmptyState.tsx ahora
}
```

Eliminar también la línea de importación en `ChatView.tsx`:
```ts
// Eliminar esta línea:
import { EmptyState } from "./EmptyState.tsx";
```

> **Por qué el criterio lo pide así:** `EmptyState` no tiene utilidad fuera de `ChatView`.
> Exportarlo desde su propio archivo lo convierte en una API pública innecesaria.
> Como componente privado dentro del mismo módulo queda claro que es un detalle de implementación.

---

## FIX-4 — `AgentConfig` no importado con `import type` (REVIEW-014)

**Archivo:** `src/web/hooks/useChatSession.ts`

**Criterio incumplido:**
> `AgentConfig` importado con `import type`.

**Estado actual:** en el `useEffect` de prompts sugeridos se usa un tipo inline:

```ts
.then((agents: { id: string; suggestedPrompts: string[] }[]) => {
```

**Cómo solucionarlo:**

1. Añadir el import al principio del archivo:

```ts
import type { AgentConfig } from "../../agents/types.ts";
```

2. Sustituir el tipo inline por `AgentConfig[]`:

```ts
.then((agents: AgentConfig[]) => {
```

> **Por qué importa:** usar el tipo real en lugar de uno inline evita divergencias silenciosas
> si `AgentConfig` cambia. El `import type` garantiza que no añade ningún código al bundle.

---

## FIX-5 — Archivos que superan el límite de líneas

Los tres archivos siguientes superan el límite fijado en sus criterios de revisión.
Son excesos pequeños pero incumplen la regla explícita.

### `src/tools/web-search.ts` — 67 líneas (límite ≤ 65) — REVIEW-010

El exceso son 2 líneas. Opciones para reducirlo:

- Comprimir el bloque de construcción de URL (líneas 39-43) en una sola expresión con
  `Object.entries` o encadenando `URLSearchParams` en el constructor.
- Unir las líneas del tipo `BraveResult` y `BraveResponse` en una sola declaración si
  el formateador lo permite.

### `src/tools/fetch-url.ts` — 79 líneas (límite ≤ 75) — REVIEW-011

El exceso son 4 líneas. La función `extractText` tiene varios `.replace()` que pueden
agruparse. Ejemplo: los reemplazos de entidades HTML (`&nbsp;`, `&amp;`, `&lt;`, `&gt;`,
`&quot;`, `&#39;`) pueden reducirse usando un mapa:

```ts
const entities: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<",
  "&gt;": ">", "&quot;": '"', "&#39;": "'",
};
// un solo replace con función de reemplazo
```

### `src/web/components/ErrorBoundary.tsx` — 62 líneas (límite ≤ 60) — REVIEW-013

El exceso son 2 líneas. El bloque del mensaje de error (líneas 47-51) puede comprimirse
eliminando la condición extra y confiando en el renderizado condicional de React:

```tsx
{this.state.error && (
  <p className="...">{this.state.error.message}</p>
)}
```

Ya está así escrito — revisar si hay líneas en blanco innecesarias o si el cierre de
algún bloque JSX puede comprimirse sin perder legibilidad.

---

## Observación extra (fuera de los criterios de review)

**Archivo:** `src/web/hooks/useChatSession.ts`, línea 66

```ts
const ws = new WebSocket(`ws://localhost:3000/ws?${params}`);
```

La URL está hardcodeada. Si el servidor corre en otro puerto o bajo HTTPS, la conexión fallará.
Sustituir por:

```ts
const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${proto}//${window.location.host}/ws?${params}`);
```

Esto no está cubierto por ningún criterio de review pero sí es un bug latente.
