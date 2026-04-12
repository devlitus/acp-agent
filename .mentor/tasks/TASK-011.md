# TASK-011 — fetch-url tool

**Estado:** ⏸ Blocked (espera TASK-010)  
**Asignado a:** GLM-4.7  
**Prioridad:** Alta  
**Depende de:** TASK-010 (para evitar conflicto en `index.ts`)  
**Desbloquea:** TASK-012

---

## Objetivo

Crear el tool `fetch_url` que permite al agente descargar una página web y extraer su texto legible. Es el complemento natural de `web_search`: primero el agente busca URLs relevantes, luego las lee en profundidad con `fetch_url`.

---

## Archivos a crear/modificar

```
src/tools/fetch-url.ts    ← CREAR
src/tools/index.ts        ← añadir .register(fetchUrlTool)
```

---

## Lo que hace el tool

1. Recibe una `url` como parámetro
2. Hace `fetch(url)` con un User-Agent de browser (muchos servidores bloquean bots sin UA)
3. Verifica que la respuesta sea HTML (no descarga PDFs ni imágenes)
4. Extrae el texto eliminando etiquetas HTML, scripts y estilos
5. Trunca el resultado a 8.000 caracteres (los contextos de los LLM son finitos)
6. Devuelve el texto limpio

---

## Archivo a crear: `src/tools/fetch-url.ts`

```ts
import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

const MAX_CHARS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ACP-Agent/1.0; +https://github.com/agentclientprotocol)";

export const fetchUrlTool: Tool = {
  kind: "read",
  definition: {
    name: "fetch_url",
    description:
      "Fetch a web page and extract its readable text content. Use after web_search to read the full content of a specific URL. Not suitable for PDFs, images, or binary files.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to fetch (must start with http:// or https://)",
        },
      },
      required: ["url"],
    },
  },
  async execute(toolCall: ToolCall, _ctx: ToolContext): Promise<string> {
    const url = toolCall.arguments.url as string;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "Error: URL must start with http:// or https://";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });
    } catch (err) {
      return `Error fetching URL: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (!response.ok) {
      return `HTTP error: ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return `Unsupported content type: ${contentType}. Only HTML and plain text are supported.`;
    }

    const html = await response.text();
    const text = extractText(html);

    if (!text) return "No readable content found on this page.";

    const truncated = text.length > MAX_CHARS;
    return truncated
      ? `${text.slice(0, MAX_CHARS)}\n\n[Content truncated at ${MAX_CHARS} characters]`
      : text;
  },
};

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}
```

---

## Por qué se eliminan `<nav>`, `<footer>`, `<header>`

Estos elementos suelen contener menús de navegación, avisos de cookies y footers con enlaces. Eliminándolos antes de quitar todas las etiquetas mejora la relación señal/ruido del texto extraído.

---

## Cambio en `src/tools/index.ts`

Añade import y registro después de `webSearchTool`:

```ts
import { fetchUrlTool } from "./fetch-url.ts";   // ← nueva línea

export const registry = new ToolRegistry()
  // ... tools existentes ...
  .register(webSearchTool)
  .register(fetchUrlTool);   // ← nueva línea al final
```

---

## Manejo de errores

| Caso | Respuesta |
|------|-----------|
| URL no empieza por http/https | `"Error: URL must start with..."` |
| Error de red (timeout, DNS) | `"Error fetching URL: {message}"` |
| HTTP 4xx o 5xx | `"HTTP error: {status} {statusText}"` |
| PDF, imagen u otro binario | `"Unsupported content type: ..."` |
| Página sin texto legible | `"No readable content found..."` |
| Texto > 8.000 chars | Truncado con aviso al final |

---

## Criterios de aceptación

- [ ] Fetches con éxito páginas HTML reales y devuelve texto legible
- [ ] URLs que no empiezan por `http://` o `https://` → error descriptivo (sin excepción)
- [ ] Content-type que no sea HTML o texto → error descriptivo (sin excepción)
- [ ] Errores de red capturados con `try/catch` → error descriptivo (sin excepción)
- [ ] Resultado truncado a 8.000 caracteres con mensaje de aviso
- [ ] `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` eliminados antes del texto
- [ ] Entidades HTML (`&nbsp;`, `&amp;`, etc.) convertidas a caracteres reales
- [ ] `fetchUrlTool` registrado en `index.ts`
- [ ] Sin errores de TypeScript
- [ ] `extractText` es función privada del módulo (no exportada)
- [ ] Archivo ≤ 75 líneas

---

## Notas del senior

- `kind: "read"` es correcto aunque el fetch sale a internet. Desde la perspectiva del usuario, es una lectura de información — no ejecuta nada en su sistema. El ACP no pedirá permiso.
- El `try/catch` envuelve solo el `fetch()`, no todo el `execute()`. Los errores de parseo de HTML (que no deberían ocurrir con regex) quedan fuera del catch intencionalmente — si fallaran, queremos ver el stack trace en los logs del servidor, no silenciarlos.
- `redirect: "follow"` permite seguir redirects (301, 302). Sin esto, muchas URLs modernas fallarían porque redirigen de HTTP a HTTPS.
- La regex `/\s{2,}/g` colapsa múltiples espacios/tabs/newlines en uno solo. Esto produce texto compacto pero legible.
- 8.000 caracteres es conservador. Los modelos modernos aguantan 100k+ tokens, pero el texto extraído de una web puede ser enorme (menús, comentarios, etc.). 8k es suficiente para el contenido principal.
- No uses `node-html-parser`, `cheerio` ni ninguna dependencia externa. La regex es suficiente y mantiene el proyecto sin bloat.

---

## Notas del junior

> _Escribe aquí tus decisiones de diseño y cambia el estado de la tarea cuando termines._
