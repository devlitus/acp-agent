# TASK-006 — Auto-title

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Media  
**Depende de:** Phase 4 completada  
**Desbloquea:** TASK-009

---

## Objetivo

Cuando el usuario envía su **primer mensaje** en una sesión nueva, guardar ese texto (truncado a 60 caracteres) como título de la sesión en la base de datos. Para sesiones ya existentes que ya tienen título, no hacer nada.

---

## Archivo a modificar

```
src/web/bridge.ts
```

**No toques ningún otro archivo.**

---

## Contexto

La clase `ACPWebSocketBridge` en `bridge.ts` gestiona el ciclo de vida del chat. Ya conoce:
- `this.sessionId` — ID de la sesión activa (se asigna en `start()`)
- `handlePrompt(text)` — se llama cada vez que el usuario envía un mensaje

El método `start()` recibe `existingSessionId?: string`:
- Si viene `existingSessionId` → sesión existente (ya tiene título, no lo sobrescribas)
- Si no viene → sesión nueva (el primer mensaje debe convertirse en título)

---

## Cambios a realizar

### 1. Añadir import de `sessionStore`

Al principio del archivo, **después** de los imports existentes:

```ts
import { sessionStore } from "../agent/session-store.ts";
```

### 2. Añadir propiedad privada a la clase

Dentro de `ACPWebSocketBridge`, entre las propiedades existentes:

```ts
private setTitleOnFirstMessage = false;
```

### 3. Activar el flag en `start()` solo para sesiones nuevas

Dentro del bloque `try` de `start()`, **justo después** de la línea donde se asigna `this.sessionId` en el bloque `else` (sesión nueva):

```ts
} else {
  const newSession = await this.connection.newSession({ ... });
  this.sessionId = newSession.sessionId;
  this.setTitleOnFirstMessage = true;  // ← añadir esta línea
}
```

### 4. Usar el flag en `handlePrompt`

Al inicio del método `handlePrompt`, **antes** de enviar el prompt al agente:

```ts
private async handlePrompt(text: string): Promise<void> {
  if (!this.connection || !this.sessionId) {
    this.sendError("No active session");
    return;
  }

  // Auto-title: solo en el primer mensaje de una sesión nueva
  if (this.setTitleOnFirstMessage) {
    this.setTitleOnFirstMessage = false;
    const title = text.trim().slice(0, 60);
    sessionStore.setTitle(this.sessionId, title);
  }

  // resto del método sin cambios
  try {
    const result = await this.connection.prompt({ ... });
    ...
  }
}
```

### 5. Resetear el flag en `cleanup()`

Dentro de `cleanup()`, añade:

```ts
this.setTitleOnFirstMessage = false;
```

---

## Comportamiento esperado

| Escenario | Resultado |
|-----------|-----------|
| Usuario abre nueva sesión, escribe "¿Cómo hago un loop en Python?" | Título guardado: `"¿Cómo hago un loop en Python?"` |
| Misma sesión, segundo mensaje "Gracias" | Sin cambio en el título |
| Usuario abre sesión existente | Sin cambio en el título |
| Texto muy largo (>60 chars) | Truncado a 60 chars exactos (`text.slice(0, 60)`) |

---

## Criterios de aceptación

- [ ] Una sesión nueva recibe el título del primer mensaje (truncado a 60 chars)
- [ ] El segundo mensaje de la misma sesión no sobreescribe el título
- [ ] Cargar una sesión existente no modifica su título
- [ ] El flag se resetea correctamente en `cleanup()`
- [ ] Sin errores de TypeScript
- [ ] El diff del archivo es mínimo: exactamente las líneas descritas arriba

---

## Notas del senior

- `sessionStore.setTitle()` ya existe en `session-store.ts` y hace exactamente lo que necesitamos. No modifiques `session-store.ts`.
- `setTitleOnFirstMessage` es un flag booleano, no un contador. No necesitas saber cuántos mensajes han pasado.
- El título se guarda **antes** de enviar el prompt al agente. Así, aunque el agente tarde en responder, el título ya está en la DB.
- No uses `sessionStore.load()` para comprobar si ya hay mensajes — es una consulta a la DB innecesaria. El flag es suficiente y más eficiente.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
