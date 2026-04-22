# Performance Report — Orchestrator UX: OrchestratorStatusBar + DelegationBubble

**Fecha**: 2026-04-18
**Feature**: Mejora de UX para el orquestador ACP — OrchestratorStatusBar (Opción B) + DelegationBubble (Opción A)
**Archivos analizados**:
- `src/web/components/OrchestratorStatusBar.tsx`
- `src/web/components/DelegationBubble.tsx`
- `src/web/hooks/useChatSession.ts`
- `src/web/components/ChatView.tsx`

---

## Bottlenecks identificados

### 🟡 Medium — Double scan de `messages` en cada render de `ChatView`

**Ubicación**: `ChatView.tsx:122-123`

```tsx
hasRunningAction={messages.some((m) => m.role === "action" && (m as ActionItem).status === "running")}
hasFirstChunk={messages.some((m) => m.role === "agent")}
```

Dos iteraciones lineales O(N) sobre el array `messages` en cada render de `ChatView`. El array crece con cada mensaje: en conversaciones largas (>50 mensajes) con actualizaciones frecuentes de chunks, esto se evalúa decenas de veces por segundo durante el streaming.

**Fix recomendado**: Derivar ambos valores dentro del hook `useChatSession` y exponerlos ya calculados, o usar `useMemo` en `ChatView`:

```tsx
const hasRunningAction = useMemo(
  () => messages.some((m) => m.role === "action" && (m as ActionItem).status === "running"),
  [messages]
);
const hasFirstChunk = useMemo(
  () => messages.some((m) => m.role === "agent"),
  [messages]
);
```

**Impacto**: Bajo-Medio. React ya re-renderiza solo cuando `messages` cambia, pero durante streaming (`chunk`) los re-renders son frecuentes. Con `useMemo` el costo de los `.some()` solo se paga cuando `messages` realmente cambia.

---

### 🟢 Low — Array allocation en `activeIndex` de `OrchestratorStatusBar`

**Ubicación**: `OrchestratorStatusBar.tsx:31`

```ts
const currentPhaseIndex = [...phases].reverse().findIndex((p) => p.active);
```

`[...phases].reverse()` crea un array temporal en cada render. Con 4 elementos es imperceptible, pero puede reemplazarse con un loop simple sin allocation:

```ts
let activeIndex = 0;
for (let i = phases.length - 1; i >= 0; i--) {
  if (phases[i].active) { activeIndex = i; break; }
}
```

**Impacto**: Negligible. 4 elementos, solo visible mientras `status === "thinking"`.

---

### 🟢 Low — `DelegationMessage` efímero: ausente en historial cargado

**Ubicación**: `useChatSession.ts` — `useEffect` de carga de historial

Los mensajes `delegation` se insertan en `messages` al recibir el evento WS `sub_agent_start`, pero no se persisten en la base de datos ni se retornan en `GET /api/sessions/${sessionId}/messages`. Al recargar una sesión con historial, los `DelegationBubble` no aparecerán.

**Comportamiento**: Esperado según el diseño actual (son eventos de estado, no mensajes permanentes). Documentar en comentario o README para que futuros desarrolladores no los busquen en DB.

**Impacto**: UX menor — el historial cargado no muestra los separadores de delegación de sesiones pasadas.

---

## Recomendaciones priorizadas

| Prioridad | Recomendación | Impacto | Esfuerzo |
|-----------|---------------|---------|---------|
| 1 | `useMemo` para `hasRunningAction` y `hasFirstChunk` en `ChatView` | Medio | Bajo (5 min) |
| 2 | Loop sin allocation para `activeIndex` en `OrchestratorStatusBar` | Negligible | Muy bajo (2 min) |
| 3 | Documentar comportamiento efímero de `DelegationMessage` | UX-Awareness | Muy bajo |

---

## Next Steps

1. Aplicar `useMemo` en `ChatView.tsx` para los dos flags derivados de `messages`.
2. Considerar exponer `hasRunningAction` y `hasFirstChunk` directamente desde `useChatSession` — esto eliminaría el costo de memoización en el componente y centralizaría la lógica de estado derivado en el hook (SRP).
3. Si en el futuro se quiere persistir los eventos de delegación para mostrarlos en historial, añadir una tabla `delegation_events(session_id, agent_id, agent_name, agent_icon, created_at)` y cargarlos en el endpoint de mensajes.
