# Performance Analysis — Local Install Fixes

**Date**: 2026-04-18  
**Scope**: 8 issues corregidos en la feature de instalación local  
**Files**: `src/config-file.ts`, `src/config.ts`, `src/llm/detector.ts`, `src/llm/lm-studio.ts`, `src/llm/ollama.ts`, `src/llm/groq.ts`, `src/web/bridge.ts`, `src/web/server.ts`, `src/agent/index.ts`, `tests/config-file.test.ts`, `package.json`

---

## Bottlenecks Identificados

### 1. [HIGH IMPACT] Fix #6: Detección paralela de LLMs — ganancia ya aplicada

**Antes**: `detectOllama()` y `detectLMStudio()` eran secuenciales. Con timeout de 2000 ms cada una, el peor caso era 4000 ms de bloqueo en el arranque de la app.

**Después**: `Promise.all([detectOllama(), detectLMStudio()])` — el peor caso es 2000 ms (el timeout de la más lenta). Ganancia: hasta 2s en el arranque para usuarios sin ningún LLM local.

**Impacto**: Alto. Efecto directo y visible en el time-to-interactive del arranque.  
**Esfuerzo**: Mínimo (1 línea). Ya aplicado.

---

### 2. [MEDIUM IMPACT] `ensureConfigDir()` se invoca en cada `writeConfig()`

**Localización**: `src/config-file.ts:26-29`

`Bun.$\`mkdir -p ${dir}\`` es un proceso externo que se forka en cada llamada a `writeConfig()`. En el flujo normal del arranque, `writeConfig()` se llama como mucho 2 veces (detección inicial + posible actualización desde setup UI). No es un hotpath, pero hay margen de mejora.

**Recomendación**: Añadir un flag de módulo `let _configDirEnsured = false` para evitar el fork tras la primera creación exitosa:

```ts
let _configDirEnsured = false;

async function ensureConfigDir(): Promise<void> {
  if (_configDirEnsured) return;
  const dir = join(_configPath, "..");
  await Bun.$`mkdir -p ${dir}`.quiet();
  _configDirEnsured = true;
}
```

**Impacto**: Bajo en producción (ruta fría). Medio en tests (cada test llama `writeConfig`).  
**Esfuerzo**: Mínimo.

---

### 3. [MEDIUM IMPACT] Constantes `@deprecated` en `config.ts` — riesgo de regresión silenciosa

**Localización**: `src/config.ts:30-44`

Las constantes de compatibilidad (`LLM_PROVIDER`, `OLLAMA_URL`, etc.) se evalúan una vez al importar el módulo. Si algún módulo futuro importa estas constantes en lugar de los getters, las mutaciones de `process.env` en `main.ts` no serán visibles, causando bugs difíciles de depurar.

**Riesgo**: El linter de TypeScript no emite advertencias de `@deprecated` en runtime, solo en IDEs.

**Recomendación** (prioridad media): Configurar una regla de ESLint/biome para prohibir la importación de las constantes `@deprecated` de `config.ts`, o bien eliminarlas en un release futuro una vez migrados todos los importadores.

**Impacto en rendimiento**: Ninguno directo, pero el impacto en correctitud puede ser alto (bug de configuración silencioso).  
**Esfuerzo**: Bajo (regla de linting) o Medio (migración y eliminación).

---

### 4. [LOW IMPACT] Fix #5: `development: { hmr }` — reducción de overhead en producción

**Localización**: `src/web/server.ts:21-23`

`Bun.serve()` con HMR activo registra un watcher de sistema de archivos sobre el proyecto completo. En producción (binario compilado), esto era overhead innecesario. Con el fix aplicado, el watcher solo se activa cuando `NODE_ENV !== "production"`.

**Impacto**: Reducción del consumo de descriptores de archivo y CPU de inotify/kqueue en producción.  
**Esfuerzo**: Ya aplicado.

---

### 5. [LOW IMPACT] `_setConfigPathForTest` es estado global de módulo

**Localización**: `src/config-file.ts:15-18`

La variable `_configPath` es mutable a nivel de módulo. En Bun, los módulos se comparten entre todos los tests del mismo proceso worker. Si dos tests corren en paralelo (actualmente los tests de Bun son en serie por defecto), podrían interferirse mutuamente si ambos llaman a `_setConfigPathForTest()` sin restaurar.

**Mitigación actual**: El `afterEach` restaura el valor. Aceptable mientras los tests sean en serie.

**Recomendación futura**: Si se activa paralelismo de tests (`--concurrency`), considerar inyectar la ruta como parámetro en `readConfig(path?)` y `writeConfig(config, path?)` en lugar de usar estado global.

**Impacto**: Ninguno actual. Bajo si se añade `--concurrency`.  
**Esfuerzo**: Medio (cambio de API).

---

## Recomendaciones priorizadas (Impacto vs Esfuerzo)

| Prioridad | Recomendación | Impacto | Esfuerzo |
|-----------|---------------|---------|----------|
| 1 | ✅ Detección paralela (Fix #6) — **ya aplicado** | Alto | Mínimo |
| 2 | Flag `_configDirEnsured` en `ensureConfigDir()` | Bajo-Medio | Mínimo |
| 3 | Regla de linting para prohibir constantes `@deprecated` de `config.ts` | Medio (correctitud) | Bajo |
| 4 | ✅ `development: { hmr }` condicional (Fix #5) — **ya aplicado** | Bajo | Mínimo |
| 5 | Inyectar ruta de config como parámetro (eliminar estado global) | Bajo | Medio |

---

## Next Steps

1. **Inmediato**: Añadir el flag `_configDirEnsured` en `config-file.ts` (2 líneas, ganancia en suite de tests).
2. **Corto plazo**: Configurar una regla de linting para detectar importaciones de las constantes `@deprecated`. Evaluar cuándo eliminarlas definitivamente una vez todos los módulos usen los getters.
3. **Largo plazo**: Si el número de tests crece y se activa paralelismo, revisar el patrón de estado global en `config-file.ts` para hacerlo thread-safe mediante inyección de parámetros.
