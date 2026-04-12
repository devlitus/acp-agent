# TASK-015 — Mobile-responsive layout

**Estado:** ✅ Done  
**Asignado a:** GLM-4.7  
**Prioridad:** Media  
**Depende de:** Phase 4+5 completadas (todos los componentes existen)  
**Desbloquea:** —

---

## Objetivo

Hacer que la interfaz funcione correctamente en pantallas pequeñas (≥ 375px). El mayor problema es el sidebar de sesiones: en escritorio está en el flujo, en móvil debe ser un overlay con backdrop para no tapar el chat por completo.

---

## Archivos a modificar

```
src/web/components/ChatView.tsx        ← sidebar overlay en móvil, header compacto
src/web/components/SessionSidebar.tsx  ← ancho máximo en móvil
src/web/components/ChatBubble.tsx      ← max-width de burbujas en móvil
```

`AgentHub.tsx` y `AgentCard.tsx` ya tienen clases responsive adecuadas (`sm:grid-cols-2 lg:grid-cols-3`). No los toques.

---

## Breakpoint a usar: `sm` (640px)

Por debajo de `sm` → móvil. Por encima → escritorio.  
No uses `md` ni `lg` en estos componentes — la interfaz tiene solo dos estados: móvil y no-móvil.

---

## Cambio 1 — Sidebar overlay en `ChatView.tsx`

### El problema actual

El sidebar empuja el contenido lateralmente. En móvil (375px), un sidebar de 256px deja solo 119px para los mensajes. Inutilizable.

### La solución: overlay en móvil, inline en escritorio

En el contenedor del sidebar en `ChatView`, reemplaza el `{sidebarOpen && <SessionSidebar ... />}` por:

```tsx
{/* Backdrop (solo móvil, solo cuando sidebar abierto) */}
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-40 sm:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}

{/* Sidebar */}
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
```

### Modificar `SessionSidebar.tsx`

El `<aside>` del sidebar necesita posicionarse diferente en móvil vs escritorio:

```tsx
<aside className="
  fixed top-0 left-0 h-full z-50 w-72
  sm:relative sm:top-auto sm:left-auto sm:h-full sm:z-auto sm:w-64
  bg-white border-r border-gray-200 flex flex-col
">
```

En móvil: `fixed` overlay encima de todo (z-50), ancho 72 (288px), cubre la altura completa.  
En escritorio (sm+): `relative`, dentro del flujo normal, ancho 64 (256px).

---

## Cambio 2 — Header compacto en `ChatView.tsx`

El header tiene tres elementos: botón Back, nombre del agente, y ModeToggle. En móvil, el texto "Historial" en el botón puede desaparecer:

```tsx
<header className="flex items-center justify-between bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex-shrink-0">
  <button
    onClick={onBack}
    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
  >
    ← <span className="hidden sm:inline">Back</span>
  </button>

  <span className="font-semibold text-gray-900 text-sm sm:text-base truncate mx-2">
    {agentId}
  </span>

  <div className="flex items-center gap-2">
    <button
      onClick={() => setSidebarOpen(o => !o)}
      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-100"
      title="Ver historial"
    >
      🕐<span className="hidden sm:inline ml-1">Historial</span>
    </button>
    <ModeToggle mode={mode} onChange={setMode} />
  </div>
</header>
```

En móvil: "←" sin texto "Back", "🕐" sin texto "Historial".  
En escritorio: "← Back", "🕐 Historial".

---

## Cambio 3 — Burbujas de mensaje en `ChatBubble.tsx`

Actualmente las burbujas tienen `max-w-[75%]`. En móvil 375px, eso es ~280px — razonable. En móvil pequeño (320px) es ~240px — un poco justo para texto con código.

Cambia a:

```tsx
// Burbuja usuario:
"bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-sm"

// Burbuja agente:
"bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] text-sm"
```

`max-w-[85%]` en móvil, `max-w-[75%]` en escritorio. Más espacio para el texto en pantallas pequeñas.

---

## Cambio 4 — Input bar en `ChatView.tsx`

El input bar ya funciona bien en móvil porque es `flex` y el `<input>` tiene `flex-1`. Solo ajusta el padding:

```tsx
<footer className="flex-shrink-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-3">
```

---

## Cómo probar

**Opción A (Chrome DevTools):**
1. Abre `http://localhost:3000` en Chrome
2. DevTools → Toggle device toolbar (Ctrl+Shift+M)
3. Selecciona "iPhone SE" (375×667)
4. Verifica cada vista

**Opción B (redimensionar ventana):**
Arrastra la ventana del navegador a ~400px de ancho y verifica que no hay overflow horizontal.

**Checklist de prueba manual:**
- [ ] AgentHub: tarjetas en una columna en móvil
- [ ] ChatView header: solo iconos en móvil (← y 🕐)
- [ ] Sidebar: aparece como overlay en móvil con backdrop oscuro
- [ ] Click en backdrop cierra el sidebar
- [ ] Mensajes: burbujas con max-w-[85%] en móvil
- [ ] Input bar: campo y botón visibles sin overflow

---

## Criterios de aceptación

- [ ] El sidebar en ChatView se renderiza como overlay en móvil (< 640px)
- [ ] El backdrop oscuro aparece detrás del sidebar en móvil
- [ ] Click en el backdrop cierra el sidebar
- [ ] En escritorio (≥ 640px), el sidebar está en el flujo normal (no overlay)
- [ ] El header muestra texto en escritorio e icono solo en móvil
- [ ] Burbujas con `max-w-[85%]` en móvil, `max-w-[75%]` en escritorio
- [ ] No hay scroll horizontal en ninguna vista en móvil 375px
- [ ] `AgentHub.tsx` y `AgentCard.tsx` no modificados
- [ ] Sin errores de TypeScript

---

## Notas del senior

- `fixed inset-0` posiciona el backdrop cubriendo toda la pantalla. `bg-black/30` es negro con 30% de opacidad — suficiente para indicar que hay un overlay sin bloquear demasiado la vista.
- `sm:hidden` en el backdrop es crítico. Sin esa clase, el backdrop aparecería también en escritorio cuando se abre el sidebar.
- La estrategia `fixed` en móvil + `relative` en escritorio para el sidebar es el patrón estándar para sidebars responsive. Las clases de Tailwind permiten expresarlo sin media queries de CSS explícitas.
- No uses `display: none` manual. Usa las clases `hidden` y `sm:flex`/`sm:block` de Tailwind — son más mantenibles y se integran con el responsive system.
- En el futuro se podría añadir animación al sidebar (slide from left). Por ahora, aparece/desaparece sin animación — es suficiente.

---

## Notas del junior

> _Ya estaba implementado. Los cambios de responsive layout estaban presentes en los componentes existentes:_
> _- ChatView.tsx: header compacto con `hidden sm:inline` para texto, sidebar overlay con backdrop_
> _- SessionSidebar.tsx: posicionamiento `fixed` en móvil, `relative` en escritorio_
> _- ChatBubble.tsx: `max-w-[85%] sm:max-w-[75%]` para burbujas_
> _No se requirieron cambios adicionales._
