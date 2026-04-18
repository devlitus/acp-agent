# Performance Analysis — Research Prompt Strengthening

**Date**: 2026-04-18 (actualizado)
**Feature**: Fortalecer prompt del agente research para uso obligatorio de web_search
**Archivos analizados**:
- `src/agents/prompts/research.md`
- `src/agents/registry.ts`
- `src/tools/invoke-agent.ts`
- `src/tools/invoke-agent-loop.ts`
- `src/tools/web-search.ts`
- `src/tools/fetch-url.ts`

---

## Overview

La feature es una reescritura del system prompt del agente `research` (de 20 a 51 líneas, de 1.253 a 2.845 bytes). No modifica código TypeScript. El objetivo es garantizar que el agente llame siempre a `web_search` antes de responder consultas sobre noticias o eventos actuales.

El análisis cubre tres áreas: (1) impacto en consumo de tokens por llamada LLM, (2) latencia de I/O real del flujo obligatorio web_search → fetch_url, y (3) bottlenecks preexistentes que la nueva directiva del prompt activa con mayor frecuencia.

---

## Findings

### Medium — Flujo obligatorio web_search + fetch_url añade 2–6 segundos de latencia por consulta

- **Impact**: Medium
- **Effort**: Medium
- **Location**: `src/tools/web-search.ts`, `src/tools/fetch-url.ts`, `src/tools/invoke-agent-loop.ts`
- **Issue**: El prompt ahora prescribe dos llamadas de red secuenciales como mínimo obligatorio: primero `web_search` (fetch a DuckDuckGo HTML + parseo) y luego `fetch_url` (hasta 200 KB de una URL). Las llamadas son secuenciales porque el loop de `runSubAgentLoop` ejecuta los tool calls de cada turno en serie (`for (const toolCall of toolCalls)`). Si el LLM emite ambas calls en el mismo turno, se ejecutan en serie igualmente. El timeout de cada tool es de 10 segundos, por lo que el worst-case antes de propagarse el AbortSignal es 20 segundos solo en I/O de tools.

  Latencia estimada por consulta research con el nuevo flujo:
  - `web_search` (DuckDuckGo): 0.5–3 s
  - `fetch_url` (página completa, 200 KB cap): 1–4 s
  - LLM call (síntesis): 3–10 s (dependiente del modelo)
  - **Total estimado**: 4.5–17 s por consulta (vs. 3–10 s previo sin búsqueda)

- **Recommendation**: Paralelizar la ejecución de tool calls cuando el LLM emite múltiples calls en el mismo turno. En `runSubAgentLoop` el bucle actual es:

  ```typescript
  // Actual — secuencial O(N*latencia)
  for (const toolCall of toolCalls) {
    result = await toolRegistry.execute(toolCall, ctx);
    history.push({ role: "tool", content: result, tool_call_id: toolCall.id });
  }
  ```

  Reemplazar por ejecución paralela con `Promise.all`:

  ```typescript
  // Recomendado — paralelo O(max_latencia)
  const results = await Promise.all(
    toolCalls.map(tc =>
      toolRegistry.execute(tc, ctx).catch(err =>
        `Tool error: ${err instanceof Error ? err.message : String(err)}`
      )
    )
  );
  for (let i = 0; i < toolCalls.length; i++) {
    history.push({ role: "tool", content: results[i], tool_call_id: toolCalls[i].id });
  }
  ```

  Esto recorta la latencia cuando el LLM emite múltiples fetch_url en paralelo (patrón posible con el nuevo prompt). No rompe el contrato del protocolo porque los resultados se insertan en el historial en el orden original.

- **Expected Improvement**: Si el LLM emite 2 tool calls en un turno (ej. `web_search` + contexto previo), la latencia de ese turno pasa de ~suma a ~máximo, un ahorro potencial de 1–4 s.

---

### Medium — Sin límite de iteraciones en `runSubAgentLoop` — el nuevo prompt aumenta la probabilidad de loops largos

- **Impact**: Medium
- **Effort**: Low
- **Location**: `src/tools/invoke-agent-loop.ts:29`
- **Issue**: El bucle `while (true)` de `runSubAgentLoop` no tiene un contador de iteraciones máximo. El prompt anterior era permisivo; el nuevo prompt prescribe `web_search → fetch_url → síntesis` como flujo obligatorio, y además añade la instrucción explícita "No saltes ningún paso. No respondas antes de ejecutar web_search." Con LLMs pequeños o locales (Ollama con modelos de 7B–14B) este tipo de instrucción imperativa puede provocar que el agente entre en un loop de tool calls (busca → lee → vuelve a buscar → vuelve a leer) sin llegar a la respuesta de síntesis. Actualmente el único freno es el `AbortSignal.timeout(120_000)` de `invoke-agent.ts:64`.

  Con 120 s de timeout y un LLM que tarda ~3 s por llamada, un loop descontrolado puede ejecutar ~15 iteraciones con ~30 llamadas de red antes de ser cortado.

- **Recommendation**: Añadir un contador de guardián con límite configurable:

  ```typescript
  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (true) {
    if (++iterations > MAX_ITERATIONS) {
      history.push({ role: "assistant", content: "[Límite de iteraciones alcanzado]" });
      break;
    }
    // ... resto del loop
  }
  ```

  El valor 10 es conservador y cubre el flujo normal web_search (1) → fetch_url (2) → síntesis (3) con margen.

- **Expected Improvement**: Previene timeouts de 120 s que bloquean la UX; el agente retorna un resultado parcial en lugar de silencio hasta timeout.

---

### Low — Token overhead del nuevo prompt: +398 tokens por invocación (tradeoff aceptado)

- **Impact**: Low
- **Effort**: N/A (no requiere acción)
- **Location**: `src/agents/prompts/research.md`
- **Issue**: El prompt creció de ~313 tokens estimados a ~711 tokens (estimación con ~4 chars/token).

  | Métrica | Antes | Después | Delta |
  |---------|-------|---------|-------|
  | Bytes | 1.253 | 2.845 | +127% |
  | Tokens estimados | ~313 | ~711 | +398 |
  | % ventana contexto (128K) | 0.24% | 0.55% | +0.31% |

  El overhead es aceptable: 400 tokens representan menos del 0.6% de una ventana de 128K tokens. El coste económico en Groq con `qwen3-32b` ($0.29/1M tokens de entrada) es ~$0.00012 por invocación adicional.

- **Recommendation**: Ninguna. El tradeoff es correcto — el prompt anterior fallaba en su objetivo principal (el agente respondía desde memoria). La regresión funcional corregida justifica el coste en tokens.

---

### Low — `readFileSync` sin caché en `AgentRegistry.getSystemPrompt()` — activado más veces con el nuevo flujo

- **Impact**: Low
- **Effort**: Low (30 min)
- **Location**: `src/agents/registry.ts:27`
- **Issue**: `getSystemPrompt()` llama a `readFileSync` sincronamente en cada invocación de `invoke_agent`. Con el nuevo prompt que incentiva el patrón "busca → lee → sintetiza → guarda en memoria", es posible que un usuario haga múltiples consultas consecutivas al agente `research` en una misma sesión. Cada `invoke_agent` releerá el archivo de disco. En práctica el coste es ~0.1–0.5 ms (archivo de 3 KB en caché del SO), pero el patrón viola la intención del constructor que inicializa el registro una sola vez.

- **Recommendation**: Añadir caché en memoria dentro de `AgentRegistry`:

  ```typescript
  private promptCache = new Map<string, string>();

  getSystemPrompt(config: AgentConfig): string {
    if (!this.promptCache.has(config.id)) {
      const path = resolve(import.meta.dir, "prompts", config.systemPromptFile);
      this.promptCache.set(config.id, readFileSync(path, "utf-8"));
    }
    return this.promptCache.get(config.id)!;
  }
  ```

  Esto elimina las lecturas de disco repetidas y alinea el comportamiento con el ciclo de vida del singleton de `AgentRegistry`.

- **Expected Improvement**: ~0.1–0.5 ms por invocación ahorrado. Más relevante: elimina una llamada `readFileSync` bloqueante en el thread principal de Bun.

---

### Low — `parseDDGResults` con regex globales reejecutadas en cada llamada a `web_search`

- **Impact**: Low
- **Effort**: Low (15 min)
- **Location**: `src/tools/web-search.ts:70-71`
- **Issue**: Los patrones `titlePattern` y `snippetPattern` se crean como literales `/regex/g` dentro de la función `parseDDGResults`. Los flags `/g` en JavaScript mantienen estado (`lastIndex`) en la instancia. Aunque aquí se crean frescos en cada llamada (no reutilizados entre llamadas), la creación de objetos RegExp no es gratuita. Con el nuevo prompt que hace `web_search` obligatorio en prácticamente cada consulta, esta función se invocará con mucha más frecuencia.

  Adicionalmente, el patrón `[\s\S]*?` en `snippetPattern` usa lazy quantifier con dotall — en HTML de 100 KB puede hacer backtracking significativo si no encuentra el tag de cierre esperado.

- **Recommendation**: Mover las constantes de regex al ámbito de módulo para que se compilen una sola vez:

  ```typescript
  // Fuera de la función, a nivel de módulo
  const TITLE_PATTERN = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  const SNIPPET_PATTERN = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  function parseDDGResults(html: string, limit: number): SearchResult[] {
    TITLE_PATTERN.lastIndex = 0;
    SNIPPET_PATTERN.lastIndex = 0;
    // ... resto sin cambios
  }
  ```

  Nota: al reutilizar instancias con `/g` es obligatorio resetear `lastIndex = 0` antes de cada uso.

- **Expected Improvement**: Eliminación de creación de objetos RegExp en cada llamada. Mejora marginal en CPU pero acumulable en sesiones largas con muchas búsquedas.

---

## Recommendations Summary

Ordenadas por ROI (impacto / esfuerzo):

1. **[Medium / Low effort]** Añadir contador `MAX_ITERATIONS = 10` en `runSubAgentLoop` — previene timeouts de 120 s con modelos locales que el nuevo prompt directivo puede desencadenar.
2. **[Medium / Medium effort]** Paralelizar tool calls con `Promise.all` en `runSubAgentLoop` — recorta 1–4 s de latencia cuando el LLM emite múltiples calls en un turno.
3. **[Low / Low effort]** Caché `promptCache` en `AgentRegistry.getSystemPrompt()` — elimina `readFileSync` bloqueante repetido.
4. **[Low / Low effort]** Mover regex de `parseDDGResults` a nivel de módulo — elimina creación de objetos RegExp por llamada.
5. **[Low / N/A]** Token overhead (+398 tokens) — aceptado, no requiere acción.

---

## Next Steps

1. **Acción inmediata**: Implementar el guardián de `MAX_ITERATIONS` en `invoke-agent-loop.ts` (esfuerzo ~30 min, riesgo de regresión mínimo). Es la mejora con mejor ROI dado el nuevo comportamiento del prompt.
2. **Próximo ciclo de mantenimiento**: Paralelizar tool calls con `Promise.all` y añadir caché de prompts en `AgentRegistry`. Pueden agruparse en un único PR.
3. **Monitorización**: Observar en uso real si el flujo obligatorio `web_search → fetch_url` produce latencias percibidas como altas por el usuario. Si es el caso, evaluar si `fetch_url` puede ser opcional en consultas de resumen rápido (ajuste de wording en el prompt, no cambio de código).
4. **Deuda preexistente no introducida por esta feature**: Los prompts de `coding.md`, `writing.md`, `personal.md` y `data.md` están en inglés mientras `research.md` y `orchestrator.md` están en español. Esta inconsistencia no afecta rendimiento pero puede confundir al LLM sobre el idioma esperado de respuesta.
