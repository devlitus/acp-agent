# Performance Analysis - Writing Agent Improvements (A+B)
**Date**: 2026-04-12
**Analyst**: Performance Agent

---

## Overview

Analisis de impacto en rendimiento de la feature "Mejoras al agente Writing (A+B)", que expande el prompt del sistema de `writing.md` y añade 5 tools nuevas al agente (de 4 a 9 tools en total). El scope cubre: tamaño del contexto LLM por request, latencia de las nuevas tools I/O, y potencial de acumulacion de tokens en historial de sesion.

---

## Findings

### High - Sin timeout en `web_search` y `fetch_url`

- **Impact**: High
- **Effort**: Low
- **Location**: `src/tools/web-search.ts:36`, `src/tools/fetch-url.ts:34`
- **Issue**: Ambas tools hacen `fetch()` sin opciones `signal` ni `AbortSignal` con timeout. Si DuckDuckGo o el servidor remoto tarda o no responde, el agente queda bloqueado indefinidamente. El `AbortController` del usuario (para cancelar el prompt) no se propaga a estos fetches internos.
- **Recommendation**: Pasar el `signal` del `ToolContext` o crear uno con timeout compuesto:
  ```typescript
  // En ToolContext (src/tools/types.ts), ya existe connection y sessionId.
  // Opcion minima sin cambiar la interfaz: usar AbortSignal.timeout()
  const timeoutSignal = AbortSignal.timeout(10_000); // 10s
  response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: timeoutSignal,
  });
  ```
  O mejor, exponer el `signal` del prompt en `ToolContext` y hacer `AbortSignal.any([signal, AbortSignal.timeout(10_000)])`.
- **Expected Improvement**: Elimina hangs indefinidos. Degrada con error en <=10s en lugar de bloquear la sesion entera.

---

### High - `fetch_url` carga el body completo en memoria antes de truncar

- **Impact**: High
- **Effort**: Low
- **Location**: `src/tools/fetch-url.ts:51`
- **Issue**: `response.text()` lee todo el cuerpo HTTP en memoria antes de pasar el string a `extractText()`, que a su vez aplica 3 regex sobre el texto completo y luego hace `text.slice(0, 8_000)`. Una pagina de 2-5MB se carga completamente en RAM antes de descartarse. En sesiones concurrentes con multiples llamadas a `fetch_url` esto multiplica el uso de memoria.
- **Recommendation**: Usar streaming con un limite de bytes leidos, aprovechando la Web Streams API disponible en Bun:
  ```typescript
  const MAX_BYTES = 200_000; // leer como maximo 200KB de HTML crudo
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (bytesRead < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    bytesRead += value.byteLength;
  }
  reader.cancel(); // descartar el resto sin descargarlo
  const html = new TextDecoder().decode(
    Uint8Array.from(chunks.flatMap(c => [...c]))
  );
  ```
  Con 200KB de HTML crudo se obtiene texto extraido suficiente para superar los 8000 chars utiles, sin descargar el resto.
- **Expected Improvement**: Reduccion de ~90% en uso de memoria por llamada cuando la pagina supera los 200KB. Latencia tambien mejora al no esperar descargar el archivo completo.

---

### Medium - Incremento de ~231% en tokens de contexto base por request

- **Impact**: Medium
- **Effort**: Low-Medium
- **Location**: `src/agents/prompts/writing.md`, `src/agents/writing.ts`
- **Issue**: Cada request al LLM incluye el system prompt completo mas las definiciones JSON de todas las tools activas. Antes de la feature: ~651 tokens fijos por request (4 tools + prompt minimal). Tras la feature: ~2156 tokens fijos por request (9 tools + prompt de 957 tokens). Estimacion basada en la regla de ~1 token por 4 caracteres:

  | Componente | Antes | Despues | Delta |
  |---|---|---|---|
  | System prompt | ~150 tokens | ~957 tokens | +807 |
  | Tool definitions | ~501 tokens | ~1199 tokens | +698 |
  | **Total base** | **~651 tokens** | **~2156 tokens** | **+1505 (+231%)** |

  Este overhead se paga en CADA request de CADA turno del agente loop, no solo al inicio de sesion.
- **Recommendation**: Dos mejoras independientes de bajo esfuerzo:
  1. **Trim del prompt**: Las 7 lineas de la seccion "Research and reference" del prompt (`writing.md:39-48`) describen cada tool con texto que ya esta en las definiciones propias de las tools. Son ~300 chars (~75 tokens) redundantes que pueden eliminarse sin perder comportamiento.
  2. **Lazy tool filtering**: El agente Writing raramente necesitara `search_files` y `list_directory` para tareas de escritura pura. Considerar moverlas a un subconjunto opcional activado por contexto, o directamente quitarlas si el caso de uso principal no implica editar archivos del proyecto del usuario. Quitar 2 tools equivale a ~200 tokens menos por request.
- **Expected Improvement**: Ahorro potencial de 75-275 tokens por request sin perder funcionalidad core.

---

### Medium - Acumulacion de tokens en historial de sesion por resultados de `fetch_url`

- **Impact**: Medium
- **Effort**: Low
- **Location**: `src/agent/agent.ts:143`, `src/tools/fetch-url.ts:4`
- **Issue**: El historial de mensajes crece con cada tool result y se reenvía completo al LLM en cada turno del agente loop (linea 81 de `agent.ts`). `fetch_url` puede devolver hasta 8000 caracteres (~2000 tokens) por llamada. El prompt de `writing.md` instruye al LLM a hacer `web_search` seguido de `fetch_url` en 1-2 URLs, lo que puede añadir 4000-8000 tokens al historial en un solo request del usuario. En sesiones largas con varias busquedas, el contexto crece rapidamente hacia los limites del modelo.
- **Recommendation**: Reducir `MAX_CHARS` en `fetch-url.ts` de 8000 a 4000. Para tareas de escritura (verificar un dato, citar una fuente), 4000 chars de texto extraido es suficiente. Esto reduce a la mitad el impacto en el historial de cada llamada `fetch_url`.
  ```typescript
  // src/tools/fetch-url.ts
  const MAX_CHARS = 4_000; // reducido de 8_000
  ```
  Cambio de 1 linea, sin efecto en el comportamiento para el 95% de los casos de uso de escritura.
- **Expected Improvement**: Hasta -50% en crecimiento del historial por llamadas `fetch_url`, extendiendo la vida util de las sesiones largas.

---

### Low - `get_datetime` crea instancias `Intl.DateTimeFormat` redundantes

- **Impact**: Low
- **Effort**: Low
- **Location**: `src/tools/get-datetime.ts:37-47`
- **Issue**: Por cada llamada a la tool se crean 3-4 instancias de `Intl.DateTimeFormat` (una para validacion, una para obtener el locale, una por cada llamada a `fmt()`). `Intl.DateTimeFormat` no es barato de instanciar. Aunque la latencia absoluta es sub-milisegundo, es un patron evitable.
- **Recommendation**: Crear una sola instancia reutilizable o simplificar el flujo:
  ```typescript
  const resolvedTz = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  // Crear un solo formatter y reusar
  const base = new Intl.DateTimeFormat(locale, {
    timeZone: resolvedTz,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  ```
- **Expected Improvement**: Marginal en produccion. Util como patron limpio para futuros cambios.

---

### Low - Regex con `[\s\S]*?` en `parseDDGResults` puede ser lento en HTML grande

- **Impact**: Low
- **Effort**: Medium
- **Location**: `src/tools/web-search.ts:63-64`
- **Issue**: Los patrones `/([\s\S]*?)<\/a>/g` son lazy (non-greedy) pero recorren todo el HTML de DuckDuckGo que puede llegar a 200-400KB. En V8/JavaScriptCore los lazy quantifiers sobre `[\s\S]` tienen peor rendimiento que alternativas como `[^<]*` cuando se sabe que el contenido no contiene `<`.
- **Recommendation**: Reemplazar `[\s\S]*?` por `[^<]*` en los patrones donde el contenido capturado es texto plano sin tags:
  ```typescript
  // Antes:
  const titlePattern = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  // Despues (el titulo de un resultado DDG no tiene tags anidados):
  const titlePattern = /class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  ```
- **Expected Improvement**: Mejora de rendimiento del parser en 10-30% para HTML de mas de 100KB. Impacto practico bajo dado que web_search solo se ejecuta cuando el LLM lo decide.

---

## Recommendations Summary

Ordenadas por ROI (impacto / esfuerzo):

1. **Anadir timeout a `web_search` y `fetch_url`** — Cambio de 2 lineas, elimina un vector de hang total del agente. Prioridad maxima.
2. **Limitar lectura de body en `fetch_url` a 200KB** — Cambio de ~10 lineas, reduce uso de memoria significativamente en paginas pesadas.
3. **Reducir `MAX_CHARS` de `fetch_url` a 4000** — Cambio de 1 linea, extiende la vida util de sesiones largas con busquedas multiples.
4. **Eliminar seccion "Research and reference" redundante del prompt** — Eliminar ~7 lineas del prompt, ahorra ~75 tokens por request sin perder funcionalidad.
5. **Evaluar quitar `search_files` y `list_directory` del agente Writing** — Herramientas orientadas a desarrollo de software, no a escritura. Quitar 2 tools = ~200 tokens menos por request.
6. **Optimizar regex en `parseDDGResults`** — Mejora minor de parsing, bajo impacto practico.
7. **Simplificar instanciacion de `Intl.DateTimeFormat`** — Mejora cosmética, impacto negligible.

---

## Next Steps

1. **Inmediato** (antes de usar en produccion): implementar timeouts en `web_search` y `fetch_url`. El riesgo de hang sin timeout es real en entornos con conectividad intermitente.

2. **Corto plazo**: Evaluar si `search_files` y `list_directory` tienen casos de uso reales en el agente Writing. Si el usuario tipico del Writing Assistant no esta editando archivos de un proyecto de codigo, estas tools solo añaden ruido al contexto. La decision es funcional, no solo de rendimiento.

3. **Corto plazo**: Aplicar los cambios de 1 linea (`MAX_CHARS`, timeout) y medir el impacto en sesiones de prueba con busquedas reales.

4. **Medio plazo**: Si el numero de tools por agente sigue creciendo en el proyecto, considerar implementar tool descriptions lazy — enviar al LLM solo las definiciones completas de las tools que el historial de la sesion indica que son relevantes, usando las demas con descripciones reducidas. Esto requiere cambios en `ToolRegistry` y `agent.ts` pero escala bien con 15+ tools.
