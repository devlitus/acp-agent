# TASK-013 — ErrorBoundary

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** Phase 4 completada  
**Desbloquea:** —

---

## Objetivo

Crear un componente `ErrorBoundary` que captura errores de render de React y muestra un mensaje amigable en lugar de un stack trace vacío. Sin él, cualquier error en `ChatView` o `AgentHub` hace que la pantalla quede en blanco.

---

## Contexto importante — por qué una clase

Los React error boundaries **deben ser class components**. No hay forma de hacerlo con hooks. Es uno de los pocos casos donde usar clases en React moderno está justificado. El junior debe entenderlo, no intentar convertirlo a función.

---

## Archivos a crear/modificar

```
src/web/components/ErrorBoundary.tsx   ← CREAR
src/web/app.tsx                         ← MODIFICAR (envolver vistas)
```

---

## Archivo a crear: `src/web/components/ErrorBoundary.tsx`

```tsx
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            An unexpected error occurred. You can try again or go back to the hub.
          </p>
          {this.state.error && (
            <p className="text-xs text-red-500 bg-red-50 rounded px-3 py-2 mb-6 text-left font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
```

---

## Modificación de `app.tsx`

Envuelve cada vista con `ErrorBoundary`. Cuando se resetea en el `ChatView`, vuelve al Hub para que el usuario pueda elegir otro agente:

```tsx
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// En el return de App:

if (currentView === "hub") {
  return (
    <ErrorBoundary>
      <AgentHub
        onSelectAgent={handleSelectAgent}
        onSelectSession={handleSelectSession}
      />
    </ErrorBoundary>
  );
}

return (
  <ErrorBoundary onReset={handleBackToHub}>
    <ChatView
      agentId={selectedAgentId!}
      sessionId={selectedSessionId}
      onBack={handleBackToHub}
      onSwitchSession={handleSwitchSession}
    />
  </ErrorBoundary>
);
```

> El `onReset` de `ChatView` llama a `handleBackToHub` — si el chat explota, el usuario vuelve al Hub limpiamente.

---

## Criterios de aceptación

- [ ] `ErrorBoundary` es class component con `getDerivedStateFromError` y `componentDidCatch`
- [ ] Error mostrado en `console.error` (no se silencia)
- [ ] Pantalla de error muestra: icono, título, descripción, mensaje del error, botón "Try again"
- [ ] El botón "Try again" limpia el estado del ErrorBoundary y llama a `onReset` (si se pasó)
- [ ] `AgentHub` y `ChatView` envueltos en `app.tsx`
- [ ] El `ErrorBoundary` de `ChatView` tiene `onReset={handleBackToHub}` para volver al Hub
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 60 líneas

---

## Notas del senior

- `getDerivedStateFromError` es `static` — lo llama React antes de re-renderizar. Devuelve el nuevo estado. No tiene efectos secundarios.
- `componentDidCatch` es donde se loguean los errores. Aquí podrías también enviarlos a un servicio de telemetría en el futuro.
- `handleReset` usa arrow function como propiedad de clase (`= () => {}`) en lugar de método normal, para evitar problemas con `this` al pasarlo como callback. Es el patrón correcto en class components TypeScript.
- El prop `onReset` es opcional (`?`). El `ErrorBoundary` alrededor de `AgentHub` no lo necesita — si el Hub explota, hacer "Try again" lo remonta tal cual.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
