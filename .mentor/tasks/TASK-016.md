# TASK-016 — AGENT_ID validation

**Estado:** ✅ Done  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** —  
**Desbloquea:** —

---

## Objetivo

Cuando el servidor web arranca y spawna un subproceso de agente con un `AGENT_ID` inválido, actualmente el proceso muere con un stack trace críptico. Esta tarea añade validación explícita con un mensaje de error claro y amigable para el desarrollador.

---

## Archivos a modificar

```
src/agent/index.ts   ← añadir try/catch + validate()
```

---

## Estado actual

```ts
const agentConfig = agentRegistry.get(AGENT_ID);  // ← lanza Error si AGENT_ID no existe
const systemPrompt = agentRegistry.getSystemPrompt(agentConfig);
const tools = toolRegistry.forAgent(agentConfig.tools);
```

Si `AGENT_ID = "typo"`, el proceso muere con:
```
Error: Unknown agent ID: "typo"
    at AgentRegistry.get (src/agents/registry.ts:14:13)
    at src/agent/index.ts:26:27
    ...
```

El desarrollador ve un stack trace y tiene que adivinar qué IDs son válidos.

---

## Cambio en `src/agent/index.ts`

Envuelve las tres llamadas que pueden fallar en un `try/catch`. Añade un segundo bloque para validar los tools del agente:

```ts
let agentConfig: AgentConfig;
let systemPrompt: string;
let tools: ToolRegistry;

try {
  agentConfig = agentRegistry.get(AGENT_ID);
  systemPrompt = agentRegistry.getSystemPrompt(agentConfig);
  tools = toolRegistry.forAgent(agentConfig.tools);
} catch (err) {
  const validIds = agentRegistry.getAll().map(a => `"${a.id}"`).join(", ");
  console.error(`\n❌  Agent startup error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`    Set AGENT_ID to one of: ${validIds}`);
  console.error(`    Example: AGENT_ID=coding bun run src/agent/index.ts\n`);
  process.exit(1);
}
```

Añade también el import del tipo que necesitas para la declaración:

```ts
import type { AgentConfig } from "../agents/types.ts";
import type { ToolRegistry } from "../tools/registry.ts";
```

Y llama a `agentRegistry.validate()` justo antes del `try/catch`, de forma que detecte errores de configuración de tools en cualquier agente al arrancar:

```ts
try {
  agentRegistry.validate();
} catch (err) {
  console.error(`\n❌  Agent configuration error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`    Check that all tool names in src/agents/*.ts exist in src/tools/index.ts\n`);
  process.exit(1);
}
```

---

## Resultado esperado

### Caso 1: AGENT_ID desconocido

```bash
AGENT_ID=typo bun run src/agent/index.ts
```

```
❌  Agent startup error: Unknown agent ID: "typo"
    Set AGENT_ID to one of: "coding", "writing", "devops", "data", "research", "personal"
    Example: AGENT_ID=coding bun run src/agent/index.ts
```

### Caso 2: agente con tool name incorrecto (typo en research.ts)

```
❌  Agent configuration error: Agent "research" references unknown tool: "web_serach"
    Check that all tool names in src/agents/*.ts exist in src/tools/index.ts
```

### Caso 3: todo correcto

El proceso arranca sin mensajes de error extra. El comportamiento normal no cambia.

---

## Criterios de aceptación

- [ ] `AGENT_ID` inválido muestra mensaje con el ID erróneo + lista de IDs válidos
- [ ] Mensaje incluye ejemplo de uso con `AGENT_ID=coding`
- [ ] `agentRegistry.validate()` llamado antes del bloque principal
- [ ] Tool name inválido en cualquier agente → mensaje descriptivo al arrancar
- [ ] Proceso termina con `process.exit(1)` en ambos casos de error
- [ ] El caso happy path (AGENT_ID válido) no imprime nada adicional
- [ ] `AgentConfig` y `ToolRegistry` importados correctamente para las declaraciones `let`
- [ ] Sin errores de TypeScript

---

## Notas del senior

- `process.exit(1)` es correcto aquí. Estamos en un subprocess cuyo padre (el bridge) detectará el exit code y enviará un mensaje de error al cliente WebSocket.
- Los mensajes de error van a `console.error`, no `console.log`. Se muestran en el stream `stderr` del subproceso y el bridge los loguea en su propio `console.error`:
  ```ts
  this.agentProcess.stderr?.on("data", (data) => {
    console.error(`[Agent ${agentId}]`, data.toString());
  });
  ```
  Así que el desarrollador los verá en los logs del servidor web.
- Las declaraciones `let` separadas (`let agentConfig: AgentConfig`) son necesarias porque TypeScript necesita que la variable esté declarada en el scope exterior para ser usada después del `try/catch`. Si las declaras dentro del `try`, no son accesibles fuera.
- El validate al inicio detecta errores de configuración aunque el `AGENT_ID` actual sea correcto. Esto sigue el principio de "fail fast" — mejor fallar al arrancar que al primer uso del agente defectuoso.

---

## Notas del junior

> _Ya estaba implementado. La validación de AGENT_ID y el manejo de errores estaban en src/agent/index.ts:_
> _- Bloque `try/catch` que valida `agentConfig`, `systemPrompt` y `tools`_
> _- Llamada a `agentRegistry.validate()` al inicio para detectar herramientas inválidas_
> _- Mensajes de error descriptivos con lista de IDs válidos y ejemplos de uso_
> _- `process.exit(1)` para terminar en caso de error_
> _No se requirieron cambios adicionales._
