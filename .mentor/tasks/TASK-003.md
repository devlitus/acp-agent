# TASK-003 — ActionCard

**Estado:** ⏸ Blocked (espera TASK-001)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-001 (necesita el tipo `"simple" | "advanced"`)  
**Desbloquea:** TASK-005

---

## Objetivo

Crear el componente `ActionCard` que visualiza una llamada a herramienta (tool call) del agente. Tiene dos modos:

- **Simple:** una línea con icono, nombre y estado (`⚙ Leyendo archivo... ✓`)
- **Advanced:** la línea anterior + un panel colapsable con el JSON de entrada/salida

---

## Archivo a crear

```
src/web/components/ActionCard.tsx
```

---

## Tipos (define en el archivo, los usará ChatView)

```tsx
export type ToolAction = {
  toolCallId: string;
  title: string;
  status: "running" | "done" | "error";
  input?: unknown;
  output?: string;
};
```

---

## Interfaz del componente

```tsx
interface ActionCardProps {
  action: ToolAction;
  mode: "simple" | "advanced";
}

export function ActionCard({ action, mode }: ActionCardProps) { ... }
```

---

## Comportamiento

### Modo simple — siempre visible

```
⚙ Ejecutando comando...      ← status: running (spinner animado)
✓ Ejecutando comando          ← status: done    (check verde)
✗ Ejecutando comando          ← status: error   (x rojo)
```

Implementación del icono según status:

```tsx
function StatusIcon({ status }: { status: ToolAction["status"] }) {
  if (status === "running") {
    return <span className="animate-spin inline-block">⚙</span>;
  }
  if (status === "done") {
    return <span className="text-green-600">✓</span>;
  }
  return <span className="text-red-600">✗</span>;
}
```

### Modo advanced — añade panel colapsable

Debajo de la línea de estado, un botón "Details" que muestra/oculta el JSON:

```
✓ Leyendo archivo
  [Details ▼]
  ┌─────────────────────────────────────┐
  │ Input:                              │
  │ { "path": "/home/user/config.json" }│
  │                                     │
  │ Output:                             │
  │ { "content": "..." }               │
  └─────────────────────────────────────┘
```

El panel colapsable usa estado local (`useState`) porque es UI state puro — no afecta a nada fuera del componente.

```tsx
const [open, setOpen] = useState(false);
```

---

## Renderizado del JSON

```tsx
<pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto mt-2">
  {JSON.stringify(action.input, null, 2)}
</pre>
```

---

## Apariencia completa (modo advanced, abierto)

```tsx
<div className="flex items-start gap-2 py-1 px-3 my-1 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
  <StatusIcon status={action.status} />
  <div className="flex-1">
    <span>{action.title}</span>
    {mode === "advanced" && (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-indigo-600 hover:underline ml-2"
        >
          Details {open ? "▲" : "▼"}
        </button>
        {open && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-400 font-medium">Input:</p>
            <pre ...>{JSON.stringify(action.input, null, 2)}</pre>
            <p className="text-xs text-gray-400 font-medium">Output:</p>
            <pre ...>{action.output}</pre>
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

---

## Criterios de aceptación

- [ ] Modo simple: muestra solo icono + título + estado en una línea
- [ ] Icono animado cuando `status === "running"`
- [ ] Icono verde cuando `status === "done"`, rojo cuando `"error"`
- [ ] Modo advanced: botón "Details" visible debajo del título
- [ ] Al pulsar "Details", se expande/colapsa el panel JSON
- [ ] El JSON se renderiza en un `<pre>` con fondo oscuro
- [ ] Cuando `mode` cambia de advanced a simple, el panel desaparece (no queda abierto en modo simple)
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 70 líneas

---

## Notas del senior

- `StatusIcon` es un componente privado dentro del mismo archivo. No lo exportes — solo lo usa `ActionCard`. Si lo necesitaras en otro lugar, lo exportarías, pero por ahora no.
- El estado `open` de "Details" debe resetearse si `mode` cambia a `"simple"`. Puedes conseguirlo con un `useEffect([mode])` que haga `setOpen(false)`. O simplemente renderizar condicional `{mode === "advanced" && open && ...}` — si el modo es simple, el panel no se muestra aunque `open` sea `true`. Esta segunda opción es más simple.
- `action.input` es `unknown` porque el servidor puede enviar cualquier shape. `JSON.stringify` acepta `unknown`, no hay problema.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
