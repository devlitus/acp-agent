# TASK-001 — ModeToggle

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** —  
**Desbloquea:** TASK-003, TASK-005

---

## Objetivo

Crear el componente `ModeToggle` que permite al usuario cambiar entre modo **Simple** y modo **Advanced**. El modo seleccionado debe persistir entre sesiones usando `localStorage`.

En modo **Simple**, los tool calls muestran solo un resumen legible (`📄 Reading config.json... ✓`).  
En modo **Advanced**, muestran los detalles JSON completos.

Este componente no tiene dependencias. Es el más sencillo de Phase 4, empieza aquí.

---

## Archivo a crear

```
src/web/components/ModeToggle.tsx
```

---

## Interfaz del componente

```tsx
interface ModeToggleProps {
  mode: "simple" | "advanced";
  onChange: (mode: "simple" | "advanced") => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) { ... }
```

El estado (`mode`) **no vive dentro de ModeToggle**. El componente solo renderiza el toggle y llama a `onChange`. El padre (`ChatView`) será quien gestione el estado y lo persista en `localStorage`.

> Esto sigue el principio de componentes controlados en React: el hijo renderiza, el padre manda.

---

## Apariencia

Un toggle pill con dos opciones. Ejemplo visual:

```
[ Simple  |  Advanced ]
    ↑ activo (fondo indigo)
```

Clases Tailwind sugeridas:

```tsx
// Contenedor
"inline-flex rounded-lg border border-gray-200 bg-white p-1"

// Botón activo
"px-3 py-1 rounded-md text-sm font-medium bg-indigo-600 text-white"

// Botón inactivo
"px-3 py-1 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"
```

---

## Hook de persistencia (a crear en el mismo archivo)

Justo encima del componente, exporta también este hook:

```tsx
export function useMode(): ["simple" | "advanced", (m: "simple" | "advanced") => void] {
  const [mode, setMode] = useState<"simple" | "advanced">(() => {
    // leer de localStorage al inicializar
    const saved = localStorage.getItem("acp-mode");
    return saved === "advanced" ? "advanced" : "simple";
  });

  function handleChange(newMode: "simple" | "advanced") {
    localStorage.setItem("acp-mode", newMode);
    setMode(newMode);
  }

  return [mode, handleChange];
}
```

El hook encapsula toda la lógica de persistencia. `ChatView` lo usará así:

```tsx
const [mode, setMode] = useMode();
// luego pasa mode y setMode a <ModeToggle> y <ActionCard>
```

---

## Criterios de aceptación

- [ ] El toggle muestra "Simple" y "Advanced"
- [ ] Al hacer click, cambia el botón activo visualmente
- [ ] Recargar la página mantiene el modo seleccionado (localStorage)
- [ ] El componente no tiene estado propio, recibe `mode` y `onChange` por props
- [ ] `useMode` exportado correctamente
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 40 líneas

---

## Notas del senior

- `localStorage` solo existe en el browser, no en el servidor. El inicializador lazy de `useState` (`() => localStorage.getItem(...)`) es la forma correcta de leerlo sin errores de SSR.
- No uses `useEffect` para sincronizar con localStorage. Léelo al inicializar y escríbelo en el handler. Más simple y sin race conditions.
- El archivo debería tener unas 35-40 líneas. Si se acerca a 60, algo está mal.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
