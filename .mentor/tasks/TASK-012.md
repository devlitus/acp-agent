# TASK-012 — Activar tools en el agente Research

**Estado:** ⏸ Blocked (espera TASK-010 y TASK-011)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-010, TASK-011  
**Desbloquea:** —

---

## Objetivo

Conectar los dos tools nuevos (`web_search`, `fetch_url`) con el agente Research. Cuando termine esta tarea, el agente Research tendrá acceso completo a internet: podrá buscar y leer páginas web.

Esta es la tarea más pequeña de Phase 6. Son cambios en dos archivos, ninguno nuevo.

---

## Archivos a modificar

```
src/agents/research.ts           ← añadir web_search y fetch_url al array tools
src/agents/prompts/research.md   ← actualizar el system prompt
```

---

## Estado actual de `research.ts`

```ts
export const researchAgent: AgentConfig = {
  id: "research",
  name: "Research Assistant",
  description: "Help research topics and gather information",
  icon: "🔍",
  audience: "all",
  tools: [
    "write_file",
    "save_memory",
    "recall_memory",
  ],
  suggestedPrompts: [
    "Help me organize my research notes",
    "Summarize what I've told you",
    "Remember this for later",
  ],
};
```

El agente tiene tools para guardar notas, pero no puede buscar en internet. Está incompleto.

---

## Cambio 1 — `src/agents/research.ts`

### `tools` — añadir los dos tools nuevos al principio

```ts
tools: [
  "web_search",    // ← nuevo
  "fetch_url",     // ← nuevo
  "write_file",
  "save_memory",
  "recall_memory",
],
```

> El orden importa para la legibilidad: las capacidades más características del agente primero.

### `suggestedPrompts` — reemplazar por prompts que usen las nuevas capacidades

```ts
suggestedPrompts: [
  "Search for the latest news on AI regulation in Europe",
  "What are the best practices for TypeScript in 2025?",
  "Fetch and summarize this article: https://...",
],
```

### `description` — actualizar para reflejar las nuevas capacidades

```ts
description: "Search the web, read articles, and synthesize information on any topic.",
```

---

## Cambio 2 — `src/agents/prompts/research.md`

Lee el archivo actual antes de modificarlo. Añade una sección que describe las capacidades de búsqueda y cómo usarlas correctamente.

La sección que añadas debe decirle al LLM:

1. **Cuándo usar `web_search`**: cuando necesite información reciente o que no esté en su entrenamiento. Siempre buscar antes de inventar datos.

2. **Cuándo usar `fetch_url`**: para leer el contenido completo de un artículo específico tras haberlo encontrado con `web_search`.

3. **Flujo recomendado**:
   ```
   web_search(query) → analiza resultados → fetch_url(url_relevante) → sintetiza
   ```

4. **Límites**: no inventar URLs, no acceder a sitios de login o intranet, informar si el contenido está truncado.

Ejemplo de sección a añadir al final del prompt existente:

```markdown
## Web Search Capabilities

You have access to real-time web search via `web_search` and can read full articles with `fetch_url`.

**When to search**: Use `web_search` whenever the user asks about current events, recent data, or specific information you are not certain about. Do not guess — search first.

**Reading articles**: After a search, use `fetch_url` on the most relevant result to read its full content before summarizing. Prefer primary sources over aggregators.

**Research workflow**:
1. Search with a precise query
2. Evaluate the results (title + description)
3. Fetch the 1–2 most relevant URLs
4. Synthesize and cite sources in your answer

**Citing sources**: Always include the URL when referencing specific facts. Format: "According to [Title](URL)..."

**Limitations**: Content may be truncated at 8,000 characters. If so, let the user know and offer to search for a more specific aspect.
```

---

## Verificación manual (sin tests automatizados)

Una vez completada la tarea, el agente Research debería poder responder:

```
Usuario: What is the current price of Bitcoin?
Agente: [usa web_search "bitcoin price today"] → [devuelve resultado] → responde con el precio actual y la fuente
```

```
Usuario: Summarize this article: https://blog.example.com/post
Agente: [usa fetch_url] → [extrae texto] → resume el contenido
```

---

## Criterios de aceptación

- [ ] `"web_search"` y `"fetch_url"` presentes en el array `tools` de `research.ts`
- [ ] `suggestedPrompts` actualizado con prompts que aprovechan las búsquedas web
- [ ] `description` actualizada
- [ ] `research.md` incluye instrucciones sobre cuándo y cómo usar cada tool
- [ ] `research.md` describe el flujo: search → fetch → synthesize
- [ ] `research.md` instruye al agente a citar fuentes con URLs
- [ ] Sin errores de TypeScript
- [ ] Ningún otro archivo modificado

---

## Notas del senior

- Los nombres de tools en el array (`"web_search"`, `"fetch_url"`) deben coincidir **exactamente** con el campo `definition.name` de cada tool. El `AgentRegistry` valida esto en startup — si hay un typo, el servidor no arranca. Comprueba el nombre exacto en `web-search.ts` y `fetch-url.ts`.
- No toques `src/agents/registry.ts` ni `src/agents/index.ts`. Solo `research.ts` y su prompt.
- El system prompt en `research.md` es la herramienta más poderosa para guiar el comportamiento del agente. Sé específico en las instrucciones: "search first, do not guess" es más efectivo que "use web search when relevant".
- Citar fuentes con URL es fundamental para un agente de investigación. Si el agente no cita, el usuario no puede verificar la información. Instrúyelo explícitamente.

---

## Por qué esta tarea existe separada de TASK-010 y TASK-011

Registrar un tool en `ToolRegistry` (TASK-010/011) y asignarlo a un agente (`AgentConfig.tools`) son dos cosas distintas:

- `ToolRegistry` es el catálogo global de todas las capacidades disponibles.
- `AgentConfig.tools` es la lista de qué subconjunto puede usar cada agente.

El `ToolRegistry.forAgent()` (añadido en Phase 0) hace el filtrado. Si no añadimos los tools a `research.ts`, el agente Research no tendrá acceso aunque los tools estén registrados globalmente. Esta separación es intencional — el agente Personal no debería poder ejecutar búsquedas web, aunque el tool exista en el registry.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
