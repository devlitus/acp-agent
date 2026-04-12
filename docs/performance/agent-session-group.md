# Performance Analysis - 2026-04-12

## Overview

Análisis de rendimiento de la feature "acordeones colapsables en Recent Sessions" de AgentHub.
Componentes analizados: `AgentSessionGroup.tsx`, `AgentHub.tsx`, `src/web/types.ts`.
Contexto: componente React frontend sin SSR, datos cargados una vez con `useEffect`, animación vía CSS `maxHeight`.

---

## Findings

### High - Funciones recreadas en cada render de AgentHub

- **Impact**: High
- **Effort**: Low
- **Location**: `src/web/components/AgentHub.tsx:41-64`
- **Issue**: `handleDelete` y `relativeTime` se definen como funciones normales dentro del cuerpo del componente. En cada render de `AgentHub` (por ejemplo al actualizar `deletingId`) se crean nuevas referencias de estas funciones. Esto hace que `AgentSessionGroup` reciba props con referencia diferente en cada render, invalidando cualquier optimización de memoización que se añada en el futuro y causando re-renders innecesarios de todos los grupos.
- **Recommendation**: Envolver ambas funciones en `useCallback`:

```tsx
// Antes
async function handleDelete(e: React.MouseEvent, sessionId: string) { ... }
function relativeTime(timestamp: number): string { ... }

// Después
const handleDelete = useCallback(async (e: React.MouseEvent, sessionId: string) => {
  e.stopPropagation();
  setDeletingId(sessionId);
  try {
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  } catch (err) {
    console.error("Failed to delete session:", err);
  } finally {
    setDeletingId(null);
  }
}, []);

const relativeTime = useCallback((timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(timestamp).toLocaleDateString();
}, []);
```

- **Expected Improvement**: Estabilidad de referencia garantizada; permite aplicar `React.memo` a `AgentSessionGroup` en el siguiente paso sin efectos secundarios.

---

### High - AgentSessionGroup no memoizado, re-renderiza con cualquier cambio de deletingId

- **Impact**: High
- **Effort**: Low
- **Location**: `src/web/components/AgentSessionGroup.tsx:14`
- **Issue**: `AgentSessionGroup` no está envuelto en `React.memo`. Cuando el usuario hace clic en eliminar, `AgentHub` actualiza `deletingId`, lo que re-renderiza todos los grupos de sesiones aunque ninguna de sus sesiones esté siendo eliminada. Con N agentes y M sesiones por agente, cada eliminación desencadena N re-renders completos del componente, incluyendo la re-evaluación del JSX del grid interior.
- **Recommendation**: Exportar el componente envuelto en `React.memo`. Solo es efectivo si `handleDelete` y `relativeTime` se estabilizan con `useCallback` (issue anterior):

```tsx
import { useState, memo } from "react";

export const AgentSessionGroup = memo(function AgentSessionGroup({
  agent,
  sessions,
  deletingId,
  onSelectSession,
  onDelete,
  relativeTime,
}: AgentSessionGroupProps) {
  // ... sin cambios internos
});
```

- **Expected Improvement**: Elimina re-renders en todos los grupos que no tienen la sesión siendo borrada. El render se limita únicamente al grupo cuya `deletingId` coincide con una de sus sesiones.

---

### High - Animación maxHeight con valor arbitrario de 4000px

- **Impact**: High
- **Effort**: Medium
- **Location**: `src/web/components/AgentSessionGroup.tsx:61`
- **Issue**: La animación `transition-all duration-200` con `maxHeight: expanded ? "4000px" : "0px"` tiene dos problemas de rendimiento:
  1. **Duración asimétrica percibida**: al colapsar, el navegador anima desde el alto real del contenido hasta 0px en 200ms, lo cual se ve correcto. Al expandir, anima desde 0px hasta 4000px, y aunque el contenido aparece visualmente antes de llegar a 4000px, la transición no termina (según el motor CSS) hasta recorrer los 4000px completos. Esto produce un efecto de "ease" que parece más lento de lo que es, porque la curva de aceleración se aplica sobre 4000px en lugar del alto real.
  2. **Fuerza layout/reflow**: `maxHeight` es una propiedad que activa layout en cada frame de animación (no es una propiedad compositor como `transform` u `opacity`). Con muchas sesiones visibles simultáneamente, colapsar/expandir múltiples grupos puede bloquear el hilo principal.
- **Recommendation**: Opción A (mínimo esfuerzo): cambiar a `height` calculado dinámicamente con `useRef` para obtener el `scrollHeight` real:

```tsx
const contentRef = useRef<HTMLDivElement>(null);

<div
  ref={contentRef}
  id={`group-${agent.id}`}
  className="overflow-hidden transition-[height] duration-200 ease-in-out"
  style={{ height: expanded ? `${contentRef.current?.scrollHeight ?? 0}px` : "0px" }}
>
```

Opción B (mayor calidad): usar `transform: scaleY` + `transform-origin: top` combinado con `opacity`, que son propiedades compositor y no provocan reflow. Requiere un wrapper adicional con `transform-origin`.

- **Expected Improvement**: Opción A elimina el artefacto de timing percibido. Opción B elimina reflows en cada frame de animación, reduciendo el tiempo de composición en dispositivos móviles o con muchos grupos abiertos.

---

### Medium - sessionsByAgent recalculado en cada render con O(agents × sessions)

- **Impact**: Medium
- **Effort**: Low
- **Location**: `src/web/components/AgentHub.tsx:67-72`
- **Issue**: La derivación `sessionsByAgent` ejecuta un `Array.map` seguido de `N` llamadas a `Array.filter` (una por agente) en cada render de `AgentHub`. La complejidad es O(agents × sessions). Aunque los datos no cambian frecuentemente, esta operación se re-ejecuta en cada render causado por `deletingId` (que cambia dos veces por cada eliminación: al iniciar y al finalizar).

```tsx
const sessionsByAgent = agents
  .map((agent) => ({
    agent,
    sessions: sessions.filter((s) => s.agent_id === agent.id), // O(sessions) × O(agents)
  }))
  .filter(({ sessions }) => sessions.length > 0);
```

- **Recommendation**: Memoizar con `useMemo` dependiendo solo de `agents` y `sessions`, y pre-indexar sesiones por `agent_id` con un `Map` para bajar a O(agents + sessions):

```tsx
const sessionsByAgent = useMemo(() => {
  const byAgent = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byAgent.get(s.agent_id) ?? [];
    list.push(s);
    byAgent.set(s.agent_id, list);
  }
  return agents
    .map((agent) => ({ agent, sessions: byAgent.get(agent.id) ?? [] }))
    .filter(({ sessions }) => sessions.length > 0);
}, [agents, sessions]);
```

- **Expected Improvement**: Eliminación del recálculo en renders causados por `deletingId`. Reducción de O(agents × sessions) a O(agents + sessions) en cada recálculo real.

---

### Medium - relativeTime recalculado en cada render, no basado en tiempo real

- **Impact**: Medium
- **Effort**: Low
- **Location**: `src/web/components/AgentHub.tsx:54-64`
- **Issue**: `relativeTime` llama a `Date.now()` en el momento del render para calcular el tiempo relativo. Si el componente no vuelve a renderizarse, los textos "2m ago", "1h ago" nunca se actualizan aunque el usuario deje la página abierta. Adicionalmente, con `useCallback` sin dependencias (recomendado arriba), `Date.now()` se capturaría en el momento de la primera creación, haciendo que todos los tiempos sean incorrectos tras el primer render. Es necesario capturar `Date.now()` dentro de la función, no fuera.
- **Recommendation**: La función ya captura `Date.now()` en tiempo de ejecución (dentro de la función), por lo que `useCallback` con `[]` es correcto. Para actualización automática, añadir un ticker opcional:

```tsx
const [now, setNow] = useState(() => Date.now());

useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 60_000); // actualiza cada minuto
  return () => clearInterval(id);
}, []);

const relativeTime = useCallback((timestamp: number): string => {
  const diffMs = now - timestamp;
  // ...
}, [now]);
```

- **Expected Improvement**: Textos de tiempo siempre actualizados sin intervención del usuario. El intervalo es barato (una actualización de estado por minuto).

---

### Low - Prop drilling de relativeTime como función

- **Impact**: Low
- **Effort**: Low
- **Location**: `src/web/components/AgentHub.tsx:109`, `src/web/components/AgentSessionGroup.tsx:11`
- **Issue**: `relativeTime` se pasa como prop desde `AgentHub` a `AgentSessionGroup`. Es una función pura sin dependencias de estado de `AgentHub` (salvo si se añade el ticker de `now` del issue anterior). El prop drilling añade acoplamiento innecesario entre los dos componentes y hace más difícil usar `AgentSessionGroup` en otros contextos.
- **Recommendation**: Si no se implementa el ticker de `now`, mover `relativeTime` a un módulo utilitario `src/web/utils/time.ts` y llamarla directamente dentro de `AgentSessionGroup`, eliminando el prop. Si se implementa el ticker, usar un custom hook `useRelativeTime` en `AgentSessionGroup`.

```tsx
// src/web/utils/time.ts
export function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

- **Expected Improvement**: Eliminación de una prop del contrato de `AgentSessionGroup`, menor acoplamiento, más fácil de testear.

---

### Low - SVG de chevron y SVGs de botones recreados como literales JSX en cada render

- **Impact**: Low
- **Effort**: Low
- **Location**: `src/web/components/AgentSessionGroup.tsx:41-54`, `src/web/components/AgentSessionGroup.tsx:89-120`
- **Issue**: Los SVG del chevron y los dos SVG del botón de eliminar (spinner y papelera) son JSX inline que React debe reconciliar en cada render, aunque nunca cambian como estructura. Son pequeños pero con muchas sesiones en múltiples grupos contribuyen al trabajo de reconciliación.
- **Recommendation**: Extraer los SVG a componentes estáticos o constantes fuera del componente principal. Al ser constantes fuera del render tree, React los reutiliza sin reconciliación:

```tsx
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg ... className={`text-muted transition-transform duration-200 ${expanded ? "rotate-90" : "rotate-0"}`}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin" ...>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const TrashIcon = () => (
  <svg ...>
    <polyline points="3 6 5 6 21 6" />
    ...
  </svg>
);
```

- **Expected Improvement**: Reducción marginal del trabajo de reconciliación con listas grandes.

---

## Recommendations Summary

Ordenadas por ROI (impacto / esfuerzo):

1. **`useCallback` en `handleDelete` y `relativeTime`** (AgentHub.tsx) — prerequisito de todas las demás optimizaciones, esfuerzo mínimo.
2. **`React.memo` en `AgentSessionGroup`** — elimina re-renders en N-1 grupos al borrar una sesión, esfuerzo mínimo.
3. **`useMemo` en `sessionsByAgent`** con indexación por `Map` — elimina recálculo O(agents × sessions) en renders de `deletingId`.
4. **Animación con `scrollHeight` real** en lugar de `maxHeight: 4000px` — elimina artefacto de timing y mejora la sensación de la animación.
5. **Extracción de `relativeTime` a módulo utilitario** — desacoplamiento, eliminación de prop drilling.
6. **Ticker de 60s para actualización de tiempos relativos** — UX, no rendimiento estricto.
7. **SVG como componentes estáticos** — optimización marginal, baja prioridad.

---

## Next Steps

1. Aplicar `useCallback` + `React.memo` como primer commit (Issues 1 y 2): son los cambios de mayor ROI con menor riesgo.
2. Añadir `useMemo` a `sessionsByAgent` con indexación por `Map` en el mismo commit o en uno separado.
3. Reemplazar la animación `maxHeight: 4000px` por `scrollHeight` calculado con `useRef`. Evaluar si Opción B (transform/opacity) merece el coste de implementación.
4. Extraer `relativeTime` a `src/web/utils/time.ts` y eliminar el prop, añadiendo opcionalmente el ticker de actualización.
