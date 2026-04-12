# TASK-010 — web-search tool

**Estado:** 🟡 Ready  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** —  
**Desbloquea:** TASK-011, TASK-012

---

## Objetivo

Crear el tool `web_search` que permite al agente Research buscar en internet usando la API de Brave Search. Siguiendo el patrón Open/Closed del proyecto: nuevo archivo + una línea en `index.ts`. Ningún otro archivo cambia (excepto `config.ts` para la API key).

---

## Archivos a crear/modificar

```
src/tools/web-search.ts    ← CREAR
src/tools/index.ts         ← añadir .register(webSearchTool)
src/config.ts              ← añadir BRAVE_API_KEY
```

---

## Contexto — cómo funciona un Tool en este proyecto

Lee `src/tools/read-file.ts` como referencia. Todos los tools siguen esta estructura:

```ts
export const miTool: Tool = {
  kind: "read" | "execute" | ...,   // controla si ACP pide permiso al usuario
  definition: {
    name: "nombre_del_tool",          // snake_case, único en el registry
    description: "...",               // el LLM lee esto para decidir cuándo usarlo
    parameters: { type: "object", properties: { ... }, required: [...] },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    // implementación
    // siempre devuelve string — es lo que el LLM recibe como resultado
  },
};
```

---

## API de Brave Search

**Documentación:** https://api.search.brave.com/  
**Registro gratuito:** https://api.search.brave.com/register  
**Tier gratuito:** 2.000 búsquedas/mes

### Request

```
GET https://api.search.brave.com/res/v1/web/search
Headers:
  X-Subscription-Token: {BRAVE_API_KEY}
  Accept: application/json
Params:
  q={query}
  count={count}          ← número de resultados (1-20, default 5)
  text_decorations=false ← sin HTML en las descripciones
  search_lang=en
```

### Response (shape relevante)

```ts
type BraveSearchResponse = {
  web?: {
    results: {
      title: string;
      url: string;
      description: string;
    }[];
  };
};
```

---

## Cambio 1 — `src/config.ts`

Añade al final del archivo:

```ts
// Brave Search
export const BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? "";
```

---

## Cambio 2 — `src/tools/web-search.ts` (archivo nuevo)

```ts
import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { BRAVE_API_KEY } from "../config.ts";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

type BraveResult = { title: string; url: string; description: string };
type BraveResponse = { web?: { results: BraveResult[] } };

export const webSearchTool: Tool = {
  kind: "read",
  definition: {
    name: "web_search",
    description:
      "Search the web for current information. Use when you need up-to-date facts, news, or topics not in your training data. Returns titles, URLs, and snippets.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        count: {
          type: "number",
          description: "Number of results to return (1-10, default 5)",
        },
      },
      required: ["query"],
    },
  },
  async execute(toolCall: ToolCall, _ctx: ToolContext): Promise<string> {
    if (!BRAVE_API_KEY) {
      return "Error: BRAVE_API_KEY is not configured. Set the environment variable to enable web search.";
    }

    const query = toolCall.arguments.query as string;
    const count = Math.min(10, Math.max(1, (toolCall.arguments.count as number | undefined) ?? 5));

    const url = new URL(BRAVE_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("text_decorations", "false");
    url.searchParams.set("search_lang", "en");

    const response = await fetch(url.toString(), {
      headers: {
        "X-Subscription-Token": BRAVE_API_KEY,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return `Search API error: ${response.status} ${response.statusText}`;
    }

    const data = await response.json() as BraveResponse;
    const results = data.web?.results ?? [];

    if (results.length === 0) {
      return "No results found.";
    }

    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`)
      .join("\n\n");
  },
};
```

---

## Cambio 3 — `src/tools/index.ts`

Añade el import y el `.register()`:

```ts
import { webSearchTool } from "./web-search.ts";   // ← nueva línea de import

export const registry = new ToolRegistry()
  .register(readFileTool)
  // ... tools existentes ...
  .register(recallMemoryTool)
  .register(webSearchTool);   // ← nueva línea
```

---

## Ejemplo de salida del tool

```
1. Climate Change | United Nations
   https://www.un.org/en/climatechange
   Climate change refers to long-term shifts in temperatures and weather patterns...

2. Climate change - Wikipedia
   https://en.wikipedia.org/wiki/Climate_change
   In common usage, climate change describes global warming—the ongoing increase...

3. ...
```

---

## Manejo de errores

| Caso | Respuesta |
|------|-----------|
| `BRAVE_API_KEY` no configurado | Mensaje explicativo (no lanza excepción) |
| API responde 4xx/5xx | `"Search API error: {status} {statusText}"` |
| Ningún resultado | `"No results found."` |
| `count` fuera de rango | Clampear silenciosamente a `[1, 10]` |

> **Regla general de tools:** `execute()` nunca debe lanzar una excepción no controlada. El LLM recibe el string de retorno — si hay un error, descríbelo en el string y deja que el agente decida cómo continuar.

---

## Criterios de aceptación

- [ ] `BRAVE_API_KEY` exportado desde `config.ts`
- [ ] El tool devuelve resultados numerados con título, URL y descripción
- [ ] Si `BRAVE_API_KEY` es `""`, devuelve mensaje de error (sin excepción)
- [ ] `count` se clampea a `[1, 10]`
- [ ] Errores HTTP devuelven string descriptivo (sin excepción)
- [ ] `webSearchTool` registrado en `index.ts`
- [ ] `kind: "read"` (no requiere permiso del usuario)
- [ ] Sin errores de TypeScript
- [ ] Archivo ≤ 65 líneas

---

## Notas del senior

- `kind: "read"` es correcto aquí. La búsqueda web no modifica nada en el sistema del usuario — solo consulta información externa. ACP no pedirá confirmación al usuario, igual que `read_file`.
- `_ctx: ToolContext` con prefijo `_` indica que el contexto no se usa. TypeScript no se quejará. No lo elimines del signature — la interfaz `Tool` lo requiere.
- El `Math.min(10, Math.max(1, count ?? 5))` es el patrón idiomático para clampear un número. Léelo como: "como máximo 10, como mínimo 1, por defecto 5".
- La description del tool es crucial. El LLM la lee para decidir cuándo llamar a `web_search` vs. usar su conocimiento interno. Sé explícito: "Use when you need up-to-date facts... not in your training data."
- Brave tiene un [panel de uso](https://api.search.brave.com/app/dashboard) donde puedes monitorear las consultas.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
