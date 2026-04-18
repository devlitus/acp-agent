# Team Memory - Multi-Agent System

This shared memory file tracks work completed by the multi-agent team (Code, Code-Review, Performance).

## How This Works

Each agent is responsible for updating this file with their activity:
- **Code Agent**: Updates after implementing tasks or fixing issues
- **Code-Review Agent**: Updates after reviewing code
- **Performance Agent**: Updates after performance analysis

---

## Code Agent Activity

### 2026-04-18 (feature: fortalecer prompt research — web_search obligatorio)
- **Task**: Fortalecer el prompt del agente research para que SIEMPRE use `web_search` antes de responder cualquier consulta sobre noticias o eventos actuales
- **Files Modified**:
  - `src/agents/prompts/research.md`
- **Changes Summary**:
  - Reescrito completamente `research.md` (de 20 a 51 líneas, de 1.253 a 2.845 bytes).
  - Añadida sección **REGLA FUNDAMENTAL — OBLIGATORIA** con lenguaje imperativo explícito: "llama `web_search` ANTES de redactar tu respuesta. Sin excepciones."
  - Lista de casos de uso obligatorio: noticias, eventos recientes, precios/estadísticas/versiones, tendencias.
  - **PROHIBIDO** responder desde memoria de entrenamiento para noticias/eventos actuales.
  - **Flujo de trabajo obligatorio** con 4 pasos numerados: web_search → evaluar → fetch_url → sintetizar+citar.
  - Sección explícita de cuándo está permitido responder sin buscar (solo 3 casos: info que el usuario proporcionó, conceptos estables, notas/memoria).
  - Herramientas documentadas con instrucción "Úsala PRIMERO" para `web_search`.
  - `invoke-agent.ts` e `invoke-agent-loop.ts` verificados: propagación de resultados correcta, sin cambios necesarios.
- **Tests**: 79/79 pasando. Errores TS preexistentes en `invoke-agent.test.ts` sin cambios.

### 2026-04-18 (fix 8 issues code-review: instalación local)
- **Task**: Corregir 8 issues detectados en code-review de la feature de instalación local
- **Files Modified**:
  - `src/config-file.ts`
  - `src/config.ts`
  - `src/llm/detector.ts`
  - `src/llm/lm-studio.ts`
  - `src/llm/ollama.ts`
  - `src/llm/groq.ts`
  - `src/web/bridge.ts`
  - `src/web/server.ts`
  - `src/agent/index.ts`
  - `tests/config-file.test.ts`
  - `package.json`
- **Changes Summary**:
  - Issue #1 (High): `config-file.ts` — eliminados `node:fs` (`mkdirSync`) y `node:os` (`homedir`). `HOME` derivado de `process.env.HOME ?? process.env.USERPROFILE ?? "/tmp"`. `ensureConfigDir()` convertida a async usando `Bun.$\`mkdir -p\``. `node:path` mantenido (sin Bun equiv directo para `join`).
  - Issue #2 (High): `config-file.ts:72` — condición de bypass cambiada de `!== "ollama"` a `=== "groq"` para que `lm-studio` pase correctamente por la detección local.
  - Issue #3 (High): `config.ts` — todas las constantes convertidas a funciones getter (`getLLMProvider()`, `getOllamaUrl()`, etc.). Constantes de compatibilidad hacia atrás mantenidas como `@deprecated` para no romper importadores existentes. `lm-studio.ts`, `ollama.ts`, `groq.ts` y `agent/index.ts` actualizados para usar los getters directamente.
  - Issue #4 (High): `bridge.ts` — añadido `import { LMStudioProvider }` y `case "lm-studio": return new LMStudioProvider()`. `createProvider()` ahora lee `getLLMProvider()` en caliente.
  - Issue #5 (Medium): `server.ts` — `development: { hmr, console }` envuelto en `...(process.env.NODE_ENV !== "production" && { ... })`.
  - Issue #6 (Medium): `detector.ts` — `detectLLM()` reescrita con `Promise.all([detectOllama(), detectLMStudio()])` para detección en paralelo.
  - Issue #7 (Medium): `tests/config-file.test.ts` — reescrito para importar y llamar las funciones reales (`readConfig`, `writeConfig`) via `_setConfigPathForTest()`. 6 tests reales en lugar de mocks manuales.
  - Issue #8 (Low): `package.json` — eliminados `"vite"` y `"@vitejs/plugin-react"` de `devDependencies` (el script `dev` ya usa `bun --hot`).
- **Tests**: 79/79 pasando. `bunx tsc --noEmit` sin nuevos errores (3 errores preexistentes en `invoke-agent.test.ts` no relacionados).

### 2026-04-18 (Iteración 4 Orchestrator Agent — indicador de sub-agente activo)
- **Task**: Implementar Iteración 4: el usuario ve en tiempo real qué sub-agente está trabajando cuando el orchestrator delega una tarea
- **Files Modified/Created**:
  - `src/web/bridge.ts`
  - `src/agent/agent.ts`
  - `src/web/hooks/useChatSession.ts`
  - `src/web/components/SubAgentIndicator.tsx` (nuevo)
  - `src/web/components/ChatView.tsx`
- **Changes Summary**:
  - `bridge.ts`: Añadidos dos nuevos tipos al union `ServerMessage` — `sub_agent_start` (con `agentId`, `agentName`, `agentIcon`) y `sub_agent_end`. En `start()`, asignado `this.agent.onSubAgentChange` con callback que emite estos mensajes via `this.send()`.
  - `agent.ts`: Añadida propiedad pública mutable `onSubAgentChange?` a `OllamaAgent`. En `runAgentLoop`, el `ToolContext` construido en cada tool call incluye ahora `onSubAgentChange: this.onSubAgentChange`.
  - `useChatSession.ts`: Añadido tipo exportado `ActiveSubAgent`. Añadido estado `activeSubAgent: ActiveSubAgent | null` (init `null`). Añadidos dos tipos al union `ServerMessage` local (alineados con bridge.ts). Handlers `sub_agent_start` → `setActiveSubAgent(...)` y `sub_agent_end` → `setActiveSubAgent(null)`. Exportado `activeSubAgent` en el objeto retornado.
  - `SubAgentIndicator.tsx` (nuevo): Componente de 18 líneas. Recibe `agentId`, `agentName`, `agentIcon`. Muestra `{agentIcon} {agentName} procesando…` con `animate-pulse` y estilos coherentes (`bg-surface-high`, `text-muted`, `font-display`).
  - `ChatView.tsx`: Importado `SubAgentIndicator`. Desestructurado `activeSubAgent` del hook. Renderizado `<SubAgentIndicator>` entre el área de mensajes y el footer cuando `activeSubAgent !== null`.
- **Tests**: 53/53 pasando. `bunx tsc --noEmit` sin errores.

### 2026-04-12 (performance: indices compuestos y prepared statements en db.ts, session-store.ts y recall-memory.ts)
- **Task**: Aplicar 4 mejoras de rendimiento recomendadas por Performance Agent
- **Files Modified**:
  - `src/db.ts`
  - `src/agent/session-store.ts`
  - `src/tools/recall-memory.ts`
- **Changes Summary**:
  - Mejora 1 (`db.ts`): Reemplazado el indice simple `idx_sessions_agent_id ON sessions(agent_id)` por el indice compuesto `idx_sessions_agent_id_updated ON sessions(agent_id, updated_at DESC)`. Elimina el filesort en `listByAgent()`.
  - Mejora 2 (`session-store.ts`): `UPDATE sessions SET updated_at` extraido a propiedad privada `updateSessionStmt: Statement` inicializada en el constructor. `save()` usa `this.updateSessionStmt.run(...)`.
  - Mejora 3 (`session-store.ts`): `INSERT INTO sessions` extraido a `createSessionStmt: Statement` y `UPDATE sessions SET title` extraido a `setTitleStmt: Statement`, ambos en el constructor. `create()` y `setTitle()` usan sus statements respectivos.
  - Mejora 4a (`db.ts`): Añadido indice `idx_memory_created_at ON memory(created_at DESC)` para acelerar las queries de `recall_memory`.
  - Mejora 4b (`recall-memory.ts`): Las dos `db.query(...)` recompiladas en cada llamada reemplazadas por `stmtAll` y `stmtKeyword` declarados como constantes de modulo con `db.prepare(...)`, compiladas una sola vez al arrancar.

### 2026-04-12 (fix 6 issues code-review: atomicidad save, prepared stmt, useEffect deps, tipo order, tests /recent, IDs únicos)
- **Task**: Corregir 6 issues reportados por code-review
- **Files Modified**:
  - `src/agent/session-store.ts`
  - `src/web/hooks/useChatSession.ts`
  - `src/web/components/AgentHub.tsx`
  - `src/web/server.test.ts`
  - `tests/session-store-integration.test.ts`
- **Changes Summary**:
  - Issue #1 (High): `session-store.ts` — `UPDATE sessions SET updated_at` movido dentro del cuerpo de la transacción `saveAll` para garantizar atomicidad completa.
  - Issue #2 (Medium): `session-store.ts` — `this.db.prepare(...)` extraído a propiedad privada `insertMsgStmt` inicializada en el constructor; eliminado el `prepare` por llamada dentro de `save()`.
  - Issue #3 (Medium): `useChatSession.ts` — Dependencia del `useEffect` de fallback cambiada de `[agentId, agentConfig]` a `[agentId, !!agentConfig]` para usar un booleano estable.
  - Issue #4 (Medium): `AgentHub.tsx` — `order` tipado explícitamente como `Record<AgentConfig["audience"], number>`.
  - Issue #5 (Medium): `server.test.ts` — Añadidos dos tests para `GET /api/sessions/recent`: devuelve 200 con array y las sesiones creadas aparecen en el resultado.
  - Issue #6 (High): `session-store-integration.test.ts` — IDs del test de ordenación cambiados a `test-session-order-${Date.now()}-N`; `push` a `testSessions` realizado inmediatamente después de cada `create()`; assertion cambiada a verificar índices relativos en lugar de `toHaveLength(3)`.

### 2026-04-12 (performance fixes y tests fallidos — 7 fixes)
- **Task**: Implementar 7 fixes de performance y tests fallidos
- **Files Modified**:
  - `src/web/components/AgentHub.tsx`
  - `src/web/components/AgentCard.tsx`
  - `src/web/components/ChatView.tsx`
  - `src/web/hooks/useChatSession.ts`
  - `src/web/app.tsx`
  - `src/web/server.ts`
  - `src/agent/session-store.ts`
  - `tests/session-store-integration.test.ts`
- **Changes Summary**:
  - Fix 1 (Performance): `AgentHub.tsx` — Añadido `useMemo` para pre-agrupar sesiones en `Map<string, Session[]>`, eliminando el `.filter()` O(N×M) en cada render. Acceso ahora en O(1) via `sessionsByAgent.get(agent.id)`.
  - Fix 2 (Performance): Eliminado fetch redundante `/api/agents` en `useChatSession`. Propagado `AgentConfig` como prop opcional desde `AgentHub` → `app.tsx` → `ChatView` → `useChatSession`. El fetch solo ocurre como fallback cuando no se pasa el prop. Los callbacks `onSelectAgent` y `onSelectSession` actualizados en `AgentHub`, `AgentCard` y `app.tsx` para transportar el `AgentConfig`. Nuevo endpoint `/api/sessions/recent` en `server.ts` para separar la ruta de "sesiones recientes" del nuevo endpoint restringido.
  - Fix 3 (Performance): `session-store.ts` — `save()` ahora usa `db.prepare()` + `db.transaction()` para envolver todos los INSERTs en una sola transacción atómica, evitando N commits individuales.
  - Fix 4 (Performance): `session-store.ts` — Añadido `LIMIT 50` a la query de `listByAgent()` para evitar retornar conjuntos ilimitados de datos.
  - Fix 5 (Performance): `AgentCard.tsx` — Refactorizado `useEffect` del listener `mousedown`. Añadido `dropdownOpenRef` para evitar re-registrar/desregistrar el listener en cada apertura/cierre del dropdown. El `useEffect` ahora tiene dependencias vacías `[]`.
  - Fix 6 (Test): `tests/session-store-integration.test.ts` — El test `listByAgent() returns only sessions for the given agent` asumía `.toHaveLength(1/2)` pero la DB global puede tener sesiones pre-existentes. Reemplazadas las assertions absolutas por assertions relativas: verificar que las sesiones creadas en el test están presentes/ausentes en las listas correctas.
  - Fix 7 (Test + Server): `server.ts` — `GET /api/sessions` sin `agentId` ahora devuelve `400 "Missing agentId"` en lugar de llamar a `handleGetRecentSessions()`. Añadida nueva ruta `GET /api/sessions/recent` para mantener la funcionalidad de sesiones recientes. `AgentHub.tsx` actualizado para usar `/api/sessions/recent`.

### 2026-04-12 (fix code-review issues AgentCard, AgentHub, SessionSidebar)
- **Task**: Corregir los 5 issues detectados en el code-review de `AgentCard.tsx`, `AgentHub.tsx` y `SessionSidebar.tsx`
- **Files Modified**:
  - `src/web/utils/relativeTime.ts` (nuevo)
  - `src/web/components/AgentCard.tsx`
  - `src/web/components/AgentHub.tsx`
  - `src/web/components/SessionSidebar.tsx`
- **Changes Summary**:
  - Issue #1 (Medium): Creado `src/web/utils/relativeTime.ts` exportando `relativeTime(timestamp: number): string` con strings en español. Eliminadas las funciones locales duplicadas de `AgentCard.tsx` (`relativeTime`) y `SessionSidebar.tsx` (`formatRelativeTime`). Ambos archivos importan ahora desde el nuevo util.
  - Issue #2 (Medium): Eliminada la interfaz `Session` local de `SessionSidebar.tsx` (que carecía de `agent_id`). Añadido `import type { Session } from "../types.ts"` usando el tipo canónico compartido.
  - Issue #4 (Medium): Añadidas clases `max-h-60 overflow-y-auto` al `<div>` contenedor de la lista en `SessionDropdown` dentro de `AgentCard.tsx` para limitar la altura con muchas sesiones.
  - Issue #5 (Medium): Añadido estado `error: string | null` en `AgentHub.tsx`. Validación de `agentsRes.ok && sessionsRes.ok` antes de parsear JSON; en caso de fallo se lanza un error con mensaje descriptivo. Bloque de UI visible `if (error)` que muestra el mensaje al usuario.
  - Issue #6 (Low): Unificados todos los strings de UI a español en los tres componentes: "Start Chat" → "Nueva conversación", "Untitled Session" → "Sin título", "Just now" → "Ahora mismo", "Xm ago" → "Hace Xm", "Xh ago" → "Hace Xh", "Xd ago" → "Hace Xd", "N sessions ▾" → "N sesiones ▾", "Loading…" → "Cargando…", "Choose a specialized agent…" → "Elige un agente especializado…", "Available Agents" → "Agentes disponibles", "Try asking" → "Prueba preguntando".

### 2026-04-12 (fix code-review issues AgentSessionGroup y AgentHub)
- **Task**: Corregir los 5 issues detectados en el code-review de `AgentSessionGroup.tsx` y `AgentHub.tsx`
- **Files Modified**:
  - `src/web/types.ts` (nuevo)
  - `src/web/components/AgentSessionGroup.tsx`
  - `src/web/components/AgentHub.tsx`
- **Changes Summary**:
  - Issue #1 (High): `maxHeight` cambiado de `sessions.length * 120` a valor fijo `4000px` para evitar recorte de contenido en grid responsive.
  - Issue #2 (Medium): Creado `src/web/types.ts` con la interfaz `Session` compartida (`id`, `agent_id`, `title: string | null`, `updated_at: number`). Eliminadas las definiciones locales duplicadas de ambos componentes y sustituidas por `import type { Session } from "../types.ts"`.
  - Issue #3 (Medium): `updated_at` corregido a `number` (Unix timestamp en ms via `Date.now()`, confirmado en `session-store.ts`). La funcion `relativeTime` en `AgentHub.tsx` actualizada para recibir y operar con `number` directamente, eliminando la conversion `new Date(dateStr)` innecesaria. Firma del prop en `AgentSessionGroup.tsx` actualizada de `(dateStr: string)` a `(timestamp: number)`.
  - Issue #4 (Low): Añadidos `id={\`group-${agent.id}\`}` al panel colapsable y `aria-controls={\`group-${agent.id}\`}` al boton de cabecera en `AgentSessionGroup.tsx`.
  - Issue #5 (Low): Reemplazado el caracter Unicode `⟳` con `animate-spin` por un SVG estandar con `<path d="M21 12a9 9 0 1 1-6.219-8.56" />`.

### 2026-04-12 (feature: acordeones colapsables en AgentHub)
- **Task**: Convertir los grupos de sesiones por agente en AgentHub.tsx en acordeones/dropdowns colapsables
- **Files Modified**:
  - `src/web/components/AgentHub.tsx`
  - `src/web/components/AgentSessionGroup.tsx` (nuevo)
- **Changes Summary**:
  - Extraido el bloque de cabecera + grid de sesiones a un componente dedicado `AgentSessionGroup.tsx` siguiendo SRP, reduciendo `AgentHub.tsx` de 174 a 135 lineas.
  - `AgentSessionGroup.tsx`: Componente con estado propio `expanded` (por defecto `true`). Cabecera clickable con icono, nombre, badge contador y chevron SVG animado con `rotate-90`/`rotate-0`. Contenido colapsable via `maxHeight` con transicion CSS `duration-200 ease-in-out`, sin librerias externas. Boton de eliminar individual funcional via prop `onDelete`. Usa `aria-expanded` para accesibilidad.

### 2026-04-12 (fix Issue #1 High: revertir regex [^<]* a [\s\S]*? en parseDDGResults)
- **Task**: Corregir Issue #1 High — regex `[^<]*` en `parseDDGResults` rompe snippets con tags HTML anidados (`<b>`, `<em>`) devolviendo match vacío
- **Files Modified**:
  - `src/tools/web-search.ts`
- **Changes Summary**:
  - `web-search.ts` líneas 70-71: Revertidos `titlePattern` y `snippetPattern` de `[^<]*` a `[\s\S]*?` para que el match funcione correctamente cuando el contenido capturado contiene tags HTML anidados que DuckDuckGo usa para resaltar términos. `cleanText()` ya se encarga de eliminar esos tags a posteriori.

### 2026-04-12 (fixes code-review issues regex y AbortSignal propagation)
- **Task**: Implementar Issue #1 (regex inefficiente en parseDDGResults) e Issue #2 (AbortSignal no propagado a ToolContext ni a readBodyCapped)
- **Files Modified**:
  - `src/tools/types.ts`
  - `src/tools/utils.ts`
  - `src/tools/web-search.ts`
  - `src/tools/fetch-url.ts`
- **Changes Summary**:
  - `types.ts`: Añadido campo opcional `signal?: AbortSignal` a la interfaz `ToolContext`.
  - `utils.ts`: Actualizada firma de `readBodyCapped` para aceptar tercer parámetro `signal?: AbortSignal`; el signal se propaga al reader via listener `abort` + comprobación al inicio del bucle + limpieza con `finally`.
  - `web-search.ts`: Reemplazados patrones `[\s\S]*?` por `[^<]*` en `titlePattern` y `snippetPattern` (más eficiente, sin backtracking). Construido signal combinado con `AbortSignal.any([timeout, ctx.signal])` y propagado al fetch y a `readBodyCapped`.
  - `fetch-url.ts`: Construido signal combinado con `AbortSignal.any([timeout, ctx.signal])` y propagado al fetch y a `readBodyCapped`.

### 2026-04-12
- **Task**: Implementar fixes de performance reportados por Performance Agent (web_search timeout, fetch_url timeout + lectura por chunks + reducir MAX_CHARS, eliminar tools innecesarias del Writing agent)
- **Files Modified**:
  - `src/tools/web-search.ts`
  - `src/tools/fetch-url.ts`
  - `src/agents/writing.ts`
- **Changes Summary**:
  - `web-search.ts`: Añadido `signal: AbortSignal.timeout(10_000)` al fetch de DuckDuckGo.
  - `fetch-url.ts`: Añadido `signal: AbortSignal.timeout(10_000)` al fetch; reducido `MAX_CHARS` de 8000 a 4000; añadida constante `MAX_BYTES = 200_000` y función `readBodyCapped()` que lee el `ReadableStream` del body en chunks y detiene la descarga al alcanzar 200KB, evitando cargar páginas completas en memoria.
  - `writing.ts`: Eliminadas las tools `search_files` y `list_directory` del array tools del Writing agent, reduciendo el scope a las herramientas relevantes para tareas de escritura.

### 2026-04-12 (fixes code-review issues reader sin cancelar y fallback sin cap)
- **Task**: Corregir Issue #1 (reader no cancelado ante excepcion) e Issue #2 (fallback sin cap cuando response.body es null) en `src/tools/utils.ts`
- **Files Modified**:
  - `src/tools/utils.ts`
- **Changes Summary**:
  - `utils.ts` Issue #1: Envuelto el bucle `while(true)` en `try/catch`; en el catch se llama `reader.cancel().catch(() => {})` y se re-lanza el error, garantizando que el reader siempre se libera ante cualquier excepcion.
  - `utils.ts` Issue #2: Cambiado `return await response.text()` por `return (await response.text()).slice(0, maxBytes)` para aplicar el limite incluso cuando `response.body` es null.

### 2026-04-12 (fixes code-review issues #1 y #2)
- **Task**: Corregir Issue #1 (readBodyCapped no aplicada en web-search) e Issue #2 (merge O(N²) con reduce)
- **Files Modified**:
  - `src/tools/utils.ts`
  - `src/tools/fetch-url.ts`
  - `src/tools/web-search.ts`
- **Changes Summary**:
  - `utils.ts`: Añadida función exportada `readBodyCapped(response, maxBytes)` con el merge eficiente O(N) usando pre-allocación con offset (fix Issue #2).
  - `fetch-url.ts`: Importada `readBodyCapped` desde `utils.ts`; eliminada la definición local de la función; mantiene `MAX_BYTES = 200_000`.
  - `web-search.ts`: Importada `readBodyCapped` desde `utils.ts`; reemplazado `response.text()` por `readBodyCapped(response, 100_000)` (fix Issue #1).

---

## Code-Review Agent Activity

### 2026-04-18 (feature: fortalecer prompt research — segunda revisión completa)
- **Task Reviewed**: Reescritura de `src/agents/prompts/research.md` para uso obligatorio de `web_search`
- **Result**: ✅ APPROVED
- **Issues Found**: 0 bloqueantes (1 preexistente Medium no introducido por esta feature)
- **Files Reviewed**: `src/agents/prompts/research.md`, `src/agents/research.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/agents/registry.ts`, `src/agents/prompts/orchestrator.md`, `src/agents/prompts/coding.md`, `src/agents/prompts/writing.md`, `src/agents/prompts/personal.md`
- **Notes**:
  - Rol principal claramente definido: "buscar y sintetizar información real de la web".
  - `web_search` marcado como PRIMER PASO OBLIGATORIO sin excepciones para consultas factuales/noticiosas.
  - Prohibición explícita de responder desde memoria de entrenamiento.
  - Flujo web_search → evaluar → fetch_url → sintetizar+citar numerado con instrucción "No saltes ningún paso".
  - Sección de excepciones bien delimitada (solo 3 casos: info aportada por el usuario, conceptos estables, gestión de notas).
  - Cierre de refuerzo: "En caso de duda, busca".
  - `invoke-agent.ts` línea 80: retorno correcto con fallback para resultado vacío.
  - `invoke-agent-loop.ts`: `accumulated` acumula todos los chunks sin pérdida; ToolContext propaga `llm`, `signal` y `onSubAgentChange`.
  - Preexistente (no introducido por esta feature): `coding.md`, `writing.md` y `personal.md` están en inglés mientras `research.md` y `orchestrator.md` están en español — inconsistencia de idioma entre prompts de sub-agentes.

### 2026-04-18 (feature: fortalecer prompt research)
- **Task Reviewed**: Reescritura de `src/agents/prompts/research.md` para uso obligatorio de `web_search`
- **Result**: ✅ APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/agents/prompts/research.md`, `src/agents/research.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`
- **Notes**:
  - Rol principal claramente definido: "buscar y sintetizar información real de la web".
  - `web_search` marcado como PRIMER PASO OBLIGATORIO sin excepciones para consultas factuales/noticiosas.
  - Prohibición explícita de responder desde memoria de entrenamiento.
  - Flujo search → fetch → synthesize → cite preservado y numerado.
  - Casos de excepción bien delimitados (solo 3 casos permitidos).
  - `invoke-agent.ts` e `invoke-agent-loop.ts` verificados: sin problemas de propagación.

### 2026-04-18 (fix 8 issues instalación local — verificación)
- **Task Reviewed**: Corrección de los 8 issues del code-review de la feature de instalación local
- **Result**: ✅ APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/config-file.ts`, `src/config.ts`, `src/llm/detector.ts`, `src/llm/lm-studio.ts`, `src/llm/ollama.ts`, `src/llm/groq.ts`, `src/web/bridge.ts`, `src/web/server.ts`, `src/agent/index.ts`, `tests/config-file.test.ts`, `package.json`
- **Notes**:
  - Issue #1: `mkdirSync`/`homedir` correctamente eliminados; `Bun.$\`mkdir -p\`` async; HOME desde env vars con fallback a `/tmp`.
  - Issue #2: Condición cambiada correctamente a `=== "groq"`, permitiendo que lm-studio pase por la detección local.
  - Issue #3: Getters implementados correctamente; constantes `@deprecated` de compatibilidad son aceptables como estrategia de migración no disruptiva. Todos los providers actualizados para usar getters.
  - Issue #4: `lm-studio` añadido en `bridge.ts` `createProvider()` con `getLLMProvider()` en caliente.
  - Issue #5: `development: { hmr }` correctamente condicionado a `NODE_ENV !== "production"`.
  - Issue #6: `Promise.all` implementado correctamente; preferencia de Ollama preservada con `??`.
  - Issue #7: Tests ahora ejercitan el módulo real via `_setConfigPathForTest`; 6 tests en lugar de 4 mocks manuales.
  - Issue #8: `vite` y `@vitejs/plugin-react` eliminados correctamente de `devDependencies`.

### 2026-04-18 (instalación local para usuarios no técnicos)
- **Task Reviewed**: Feature completa de instalación local — detector de LLM, config persistente, entry point único, SetupPage, endpoints de setup, GitHub Actions release
- **Result**: ISSUES FOUND
- **Issues Found**: 8
- **Files Reviewed**: `src/llm/detector.ts`, `src/config-file.ts`, `src/llm/lm-studio.ts`, `src/main.ts`, `src/config.ts`, `src/agent/index.ts`, `src/web/server.ts`, `src/web/app.tsx`, `src/web/components/SetupPage.tsx`, `.github/workflows/release.yml`, `tests/detector.test.ts`, `tests/config-file.test.ts`, `package.json`

### 2026-04-12 (acordeones colapsables en AgentHub)
- **Task Reviewed**: Convertir los grupos de sesiones por agente en AgentHub.tsx en acordeones/dropdowns colapsables
- **Result**: CHANGES REQUIRED
- **Issues Found**: 5
  - Issue #1 (High): `AgentSessionGroup.tsx:65` — `sessions.length * 120` fragil con grid responsive; puede recortar contenido en pantallas grandes o titulos largos
  - Issue #2 (Medium): `AgentSessionGroup.tsx:4-9` y `AgentHub.tsx:6-11` — interfaz `Session` duplicada en ambos archivos, viola DRY
  - Issue #3 (Medium): `AgentHub.tsx:10` vs `SessionSidebar.tsx:6` — `updated_at` tipado como `string` en AgentHub pero `number` en SessionSidebar; inconsistencia silenciosa
  - Issue #4 (Low): `AgentSessionGroup.tsx:33-60` — boton de cabecera del acordeon sin `aria-controls` ni `id` en el panel
  - Issue #5 (Low): `AgentSessionGroup.tsx:93` — spinner con caracter Unicode `⟳` + `animate-spin` puede verse decentrado en algunos navegadores
- **Files Reviewed**: `src/web/components/AgentSessionGroup.tsx`, `src/web/components/AgentHub.tsx`, `src/web/components/SessionSidebar.tsx`, `src/agents/types.ts`

### 2026-04-12 (performance fixes review)
- **Task Reviewed**: Fixes de performance: timeout en web_search y fetch_url, lectura por chunks en fetch_url, MAX_CHARS reducido, eliminación de search_files y list_directory del Writing agent
- **Result**: ISSUES FOUND
- **Issues Found**: 2
  - Issue #1 (Medium): `web-search.ts:48` — `response.text()` sin límite de bytes; `readBodyCapped()` solo se aplicó en `fetch-url.ts` pero no en `web-search.ts`
  - Issue #2 (Low): `fetch-url.ts:86-93` — merge de chunks mediante `reduce` hace O(N²) copias de memoria; usar pre-allocación con offset
- **Files Reviewed**: `src/tools/web-search.ts`, `src/tools/fetch-url.ts`, `src/agents/writing.ts`, `src/tools/index.ts`, `src/agents/personal.ts`, `src/agents/coding.ts`, `src/agents/research.ts`

### 2026-04-12
- **Task Reviewed**: Mejorar el agente Writing con opcion A+B (enriquecer prompt + añadir tools)
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/agents/writing.ts`, `src/agents/prompts/writing.md`, `src/tools/index.ts`, `src/tools/web-search.ts`, `src/tools/fetch-url.ts`, `src/tools/search-files.ts`, `src/tools/list-directory.ts`, `src/tools/get-datetime.ts`

### 2026-04-12 (segunda iteracion performance fixes review)
- **Task Reviewed**: Segunda iteracion de fixes de performance: extraccion de `readBodyCapped` a `utils.ts`, importacion en `fetch-url.ts` y `web-search.ts`, limite 100KB en web-search y 200KB en fetch-url
- **Result**: ISSUES FOUND
- **Issues Found**: 2
  - Issue #1 (Medium): `src/tools/utils.ts:11-22` — reader no se cancela si `reader.read()` lanza excepcion; falta `try/finally`
  - Issue #2 (Low): `src/tools/utils.ts:5` — fallback `response.text()` no aplica el cap de bytes cuando `response.body` es null
- **Files Reviewed**: `src/tools/utils.ts`, `src/tools/fetch-url.ts`, `src/tools/web-search.ts`, `src/tools/index.ts`, `src/tools/types.ts`, `src/tools/registry.test.ts`

### 2026-04-12 (tercera iteracion performance fixes review)
- **Task Reviewed**: Tercera iteracion de fixes de performance: try/catch en bucle de lectura de `readBodyCapped` y fallback con `.slice(0, maxBytes)` cuando `response.body` es null
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/tools/utils.ts`

### 2026-04-12 (segunda revision: acordeones colapsables + types.ts)
- **Task Reviewed**: Verificacion de los 5 issues corregidos en AgentSessionGroup.tsx, AgentHub.tsx y nuevo src/web/types.ts
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/web/types.ts`, `src/web/components/AgentSessionGroup.tsx`, `src/web/components/AgentHub.tsx`

### 2026-04-12 (tercera revision manual: verificacion 5 puntos especificos)
- **Task Reviewed**: Verificacion puntual de AgentSessionGroup.tsx, AgentHub.tsx y src/web/types.ts contra 5 criterios: maxHeight fijo, Session en types.ts, updated_at como number, aria-controls+id en acordeon, spinner SVG
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/web/components/AgentSessionGroup.tsx`, `src/web/components/AgentHub.tsx`, `src/web/types.ts`

### 2026-04-12 (dropdown inline sesiones en AgentCard - Opcion B1)
- **Task Reviewed**: Integrar historial de sesiones en AgentCard con dropdown inline; eliminar seccion "Recent Sessions" de AgentHub; eliminar AgentSessionGroup.tsx
- **Result**: CHANGES REQUIRED
- **Issues Found**: 5
  - Issue #1 (Medium): `AgentCard.tsx:12` y `SessionSidebar.tsx:16` — Funcion `relativeTime`/`formatRelativeTime` duplicada en dos archivos con strings en idiomas distintos. Extraer a `src/web/utils/relativeTime.ts`.
  - Issue #2 (Medium): `SessionSidebar.tsx:3-7` — Tipo `Session` definido localmente sin `agent_id`, en lugar de importar el tipo canónico de `src/web/types.ts`. Inconsistencia silenciosa.
  - Issue #4 (Medium): `AgentCard.tsx:32` — Dropdown sin `max-h-*` ni `overflow-y-auto`; con muchas sesiones crece sin límite vertical y puede salirse del viewport.
  - Issue #5 (Medium): `AgentHub.tsx:24-25` — Sin validación de `agentsRes.ok` / `sessionsRes.ok` antes de parsear JSON; no hay estado de error visible al usuario.
  - Issue #6 (Low): Mezcla de inglés/español en strings de UI (`AgentCard`: "Just now", "Untitled Session" vs `SessionSidebar`: "Ahora mismo", "Sin título").
- **Files Reviewed**: `src/web/components/AgentCard.tsx`, `src/web/components/AgentHub.tsx`, `src/web/components/SessionSidebar.tsx`, `src/web/types.ts`, `src/agents/types.ts`

### 2026-04-12 (quinta revision: segunda ronda AgentCard + AgentHub + SessionSidebar + relativeTime.ts)
- **Task Reviewed**: Verificacion de los 5 issues corregidos en la segunda ronda: relativeTime extraida a utils, Session importada en SessionSidebar, dropdown con max-h-60, AgentHub con response.ok y error visible, strings en espanol
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/web/utils/relativeTime.ts`, `src/web/components/AgentCard.tsx`, `src/web/components/AgentHub.tsx`, `src/web/components/SessionSidebar.tsx`, `src/web/types.ts`

### 2026-04-12 (septima revision: indices compuestos y prepared statements)
- **Task Reviewed**: Verificacion de 4 mejoras de performance — indice compuesto idx_sessions_agent_id_updated, updateSessionStmt, createSessionStmt, setTitleStmt en session-store.ts, idx_memory_created_at + stmtAll/stmtKeyword en recall-memory.ts
- **Result**: APPROVED
- **Issues Found**: 1 (Low — delete() en session-store.ts usa db.run() con array, inconsistencia de patron vs el resto de la clase; no afecta funcionalidad)
- **Files Reviewed**: `src/db.ts`, `src/agent/session-store.ts`, `src/tools/recall-memory.ts`

### 2026-04-12 (sexta revision: verificacion 6 issues de ronda anterior)
- **Task Reviewed**: Verificar que los 6 issues anteriores (atomicidad save, prepared stmt, useEffect deps, tipo order, tests /recent, IDs unicos) estan resueltos en la segunda ronda de fixes
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/agent/session-store.ts`, `src/web/hooks/useChatSession.ts`, `src/web/components/AgentHub.tsx`, `src/web/server.test.ts`, `tests/session-store-integration.test.ts`

### 2026-04-12 (cuarta iteracion: regex + AbortSignal propagation)
- **Task Reviewed**: Fix Issue #1 (regex `[\s\S]*?` -> `[^<]*` en parseDDGResults) y Fix Issue #2 (signal opcional en ToolContext propagado a readBodyCapped, fetch-url y web-search via AbortSignal.any)
- **Result**: ISSUES FOUND
- **Issues Found**: 1
  - Issue #1 (High): `src/tools/web-search.ts:70-71` — El regex `[^<]*` en `titlePattern` y `snippetPattern` no es equivalente al original `[\s\S]*?` cuando el contenido capturado contiene tags HTML anidados (ej. `<b>`, `<em>` que DDG usa para resaltar keywords). Con `[^<]*` el match falla completamente devolviendo array vacío; el patrón original capturaba el HTML completo que luego `cleanText()` sanitizaba. Resultado: pérdida silenciosa de snippets y titles válidos.
- **Files Reviewed**: `src/tools/types.ts`, `src/tools/utils.ts`, `src/tools/web-search.ts`, `src/tools/fetch-url.ts`

---

## Performance Agent Activity

### 2026-04-18 (feature: fortalecer prompt research — actualizado)
- **Analysis Scope**: `src/agents/prompts/research.md`, `src/agents/registry.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/tools/web-search.ts`, `src/tools/fetch-url.ts`
- **Critical Issues**: 0
- **High Priority**: 0
- **Medium Priority**: 2
  - Flujo obligatorio web_search + fetch_url secuencial añade 2–6 s de latencia por consulta; paralelizar con Promise.all en runSubAgentLoop
  - Sin límite de iteraciones en runSubAgentLoop — nuevo prompt directivo aumenta riesgo de loops largos con modelos locales; añadir MAX_ITERATIONS=10
- **Low Priority**: 3
  - Token overhead +398 tokens por invocación (aceptado — tradeoff necesario para corregir comportamiento)
  - `readFileSync` sin caché en `AgentRegistry.getSystemPrompt()` — añadir promptCache Map
  - Regex de parseDDGResults creadas por llamada en lugar de a nivel de módulo
- **Report Location**: `docs/performance/research-prompt-strengthening.md`

### 2026-04-18 (fix 8 issues instalación local)
- **Analysis Scope**: `src/config-file.ts`, `src/config.ts`, `src/llm/detector.ts`, `src/web/bridge.ts`, `src/web/server.ts`, `src/agent/index.ts`, `tests/config-file.test.ts`
- **Critical Issues**: 0
- **High Priority**: 0 (Fix #6 — detección paralela — ya aplicado y resuelve el bottleneck más importante)
- **Medium Priority**: 2 (flag `_configDirEnsured` en `ensureConfigDir()`, regla linting para constantes `@deprecated`)
- **Low Priority**: 2 (`development: { hmr }` condicional ya aplicado, estado global `_configPath` aceptable en serie)
- **Report Location**: `docs/performance/local-install-fixes.md`

### 2026-04-12
- **Analysis Scope**: Feature "Mejoras al agente Writing (A+B)" — impacto en tokens de contexto LLM, latencia de tools nuevas (web_search, fetch_url, search_files, list_directory, get_datetime), acumulacion de historial en sesiones largas
- **Critical Issues**: 0
- **High Priority**: 2 (sin timeout en fetch HTTP, carga completa de body antes de truncar)
- **Medium Priority**: 2 (incremento +231% tokens base, acumulacion MAX_CHARS en historial)
- **Low Priority**: 3 (Intl.DateTimeFormat redundante, regex lento en parseDDGResults, tools de filesystem posiblemente fuera de scope)
- **Report Location**: `docs/performance/writing-agent-improvements.md`

### 2026-04-12 (post-fix verification)
- **Analysis Scope**: Verificacion de los fixes de performance aplicados al agente Writing — `src/tools/utils.ts`, `src/tools/fetch-url.ts`, `src/tools/web-search.ts`, `src/agents/writing.ts`
- **Critical Issues**: 0
- **High Priority**: 0 (todos resueltos)
- **Medium Priority**: 0 (todos resueltos)
- **Low Priority Residual**: 4 (regex `[\s\S]*?` pendiente, fallback `response.text()` sin stream, `Intl.DateTimeFormat` instanciacion multiple, `AbortSignal` no propagado desde ToolContext)
- **Report Location**: `docs/performance/writing-agent-fixes.md`

### 2026-04-12 (acordeones colapsables AgentHub - AgentSessionGroup)
- **Analysis Scope**: Feature "acordeones colapsables en Recent Sessions" — `AgentSessionGroup.tsx`, `AgentHub.tsx`, `src/web/types.ts`. Re-renders innecesarios, eficiencia de animación CSS, escalabilidad con listas grandes, prop drilling.
- **Critical Issues**: 0
- **High Priority**: 3 (funciones recreadas sin useCallback, AgentSessionGroup sin React.memo, animación maxHeight 4000px con reflow por frame)
- **Medium Priority**: 2 (sessionsByAgent O(agents×sessions) sin useMemo, relativeTime no actualiza en tiempo real)
- **Low Priority**: 2 (prop drilling de relativeTime, SVG inline recreados en cada render)
- **Report Location**: `docs/performance/agent-session-group.md`

### 2026-04-12 (post-fix verification v2: session-store, AgentHub, AgentCard, useChatSession, server.ts)
- **Analysis Scope**: Verificacion de los 5 fixes de performance aplicados — transaccion SQLite en save(), prepared statement en constructor, useMemo con Map en AgentHub, AgentConfig como prop en useChatSession, ref unico para mousedown listener en AgentCard
- **Critical Issues**: 0
- **High Priority**: 1 (indices SQLite ausentes — agent_id y updated_at sin indice)
- **Medium Priority**: 3 (queries sin prepared stmt en load/listRecent/getDisplayMessages, delete sin transaccion, SessionSidebar con fetch propio al abrir)
- **Low Priority**: 2 (spawn proceso por WebSocket sin pool, loadSession con await en bucle serial)
- **Report Location**: analisis incluido en respuesta del agente (sin archivo MD)

### 2026-04-12 (indices compuestos y prepared statements — performance mejoras)
- **Analysis Scope**: 4 mejoras de performance — indice compuesto sessions, updateSessionStmt, createSessionStmt+setTitleStmt, indice memory + stmtAll/stmtKeyword en recall-memory
- **Critical Issues**: 0
- **High Priority**: 0
- **Medium Priority**: 0
- **Low Priority Residual**: 1 (delete() en session-store.ts usa db.run() con array en lugar de statements preparados, inconsistencia de estilo menor)

### 2026-04-18 (Orchestrator Agent Iteración 1 — invoke-agent, invoke-agent-loop, orchestrator)
- **Analysis Scope**: `src/agent/types.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/agents/orchestrator.ts`, `src/agents/prompts/orchestrator.md`. Evaluacion de importaciones lazy, mini-loop del sub-agente, acumulacion de texto, context window y encadenamiento de sub-agentes.
- **Critical Issues**: 0
- **High Priority**: 0
- **Medium Priority**: 2 (sin limite de iteraciones en el mini-loop; context_summary sin truncado defensivo)
- **Low Priority**: 2 (readFileSync sin cache en AgentRegistry; tool calls del sub-agente en serie)
- **Report Location**: respuesta directa del agente (sin archivo MD)

### 2026-04-18 (Iteración 3 Orchestrator Agent — frontend sin hub)
- **Analysis Scope**: `src/web/app.tsx`, `src/web/components/ChatView.tsx`, `src/web/components/SessionSidebar.tsx`. Verificación de los 7 criterios de la Iteración 3: arranque directo en ChatView, handleNewSession, EmptyState, agentId hardcodeado en SessionSidebar, referencias rotas eliminadas, AgentHub/AgentCard intactos, prop drilling.
- **Critical Issues**: 0
- **High Priority**: 0
- **Medium Priority**: 1 (agentId hardcodeado en SessionSidebar sin prop — acoplamiento a "orchestrator")
- **Low Priority**: 1 (dos botones de historial duplicados en ChatView para mobile/desktop)
- **Report Location**: respuesta directa del agente (sin archivo MD)

---

## Code-Review Agent Activity

### 2026-04-18 (Iteración 3 Orchestrator Agent — frontend sin hub)
- **Task Reviewed**: Iteración 3 del Orchestrator Agent — `app.tsx` arranca directamente en ChatView con agentId="orchestrator", nueva sesión sin recarga, EmptyState genérico, SessionSidebar filtra por orchestrator hardcodeado, sin referencias rotas, AgentHub/AgentCard intactos
- **Result**: APPROVED (con observaciones menores documentadas)
- **Issues Found**: 2 (ambos Low — no bloquean aprobación)
- **Files Reviewed**: `src/web/app.tsx`, `src/web/components/ChatView.tsx`, `src/web/components/SessionSidebar.tsx`, `src/web/components/AgentHub.tsx`, `src/web/components/AgentCard.tsx`, `src/web/hooks/useChatSession.ts`, `src/web/server.ts`

### 2026-04-18 (Iteración 2 Orchestrator Agent — bridge in-process)
- **Task Reviewed**: Iteración 2 del Orchestrator Agent — DirectConnection, bridge sin spawn, OllamaAgent in-process
- **Result**: CHANGES REQUIRED
- **Issues Found**: 2
  - Issue #1 (High): `src/web/direct-connection.ts:87-89` — Promise en `requestPermission` nunca se rechaza si el WebSocket se cierra. `cleanup()` llama a `.clear()` pero no rechaza las Promises pendientes; el agente queda colgado indefinidamente esperando resolución.
  - Issue #2 (Medium): `src/web/direct-connection.ts:5-11` y `src/web/bridge.ts:23-29` — Tipo `ServerMessage` definido de forma idéntica en dos archivos. Viola DRY; debería exportarse desde `bridge.ts` e importarse en `direct-connection.ts`.
- **Files Reviewed**: `src/web/direct-connection.ts`, `src/web/bridge.ts`, `src/web/server.ts`, `src/agent/types.ts`, `src/agent/agent.ts`, `src/tools/types.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/agents/orchestrator.ts`, `src/agents/index.ts`, `src/tools/index.ts`

### 2026-04-18 (Iteración 1 Orchestrator Agent — backend base)
- **Task Reviewed**: Iteración 1 del Orchestrator Agent — AgentConnection, invoke-agent.ts, invoke-agent-loop.ts, orchestrator.ts, orchestrator.md
- **Result**: CHANGES REQUIRED
- **Issues Found**: 5
  - Issue #1 (Critical): `src/tools/types.ts` + `src/tools/utils.ts:50` — `AgentConnection` no incluye `createTerminal`, `readTextFile` ni `writeTextFile`. Las tools `run_command`, `list_directory`, `search_files`, `read_file` y `write_file` tienen errores de tipo TypeScript (confirmados con `bunx tsc --noEmit`).
  - Issue #2 (High): `src/tools/invoke-agent-loop.ts:50` — stub de `requestPermission` retorna `{ granted: false }` que no satisface `acp.RequestPermissionResponse` (requiere campo `outcome`). Error de tipo TS confirmado.
  - Issue #3 (High): `src/tools/invoke-agent-loop.ts` — el ToolContext del sub-agente no propaga `ctx.llm` ni `ctx.onSubAgentChange`. Si un sub-agente invoca `invoke_agent` recursivamente, fallará con error "ctx.llm no está definido".
  - Issue #4 (Medium): `src/tools/get-datetime.ts:22` — `execute` declarado sin `async` y retorna `string` en lugar de `Promise<string>`, incumpliendo la interfaz `Tool`. Error de tipo TS confirmado.
  - Issue #5 (Low): `src/tools/invoke-agent.ts:12-15` — `agent_id` no usa `enum` en el schema JSON. El plan especificaba `enum: ["coding", "writing", "research", "personal", "data", "devops"]` pero la implementación usa `description` libre, perdiendo la restricción explícita para el LLM.
- **Files Reviewed**: `src/agent/types.ts`, `src/agent/agent.ts`, `src/tools/types.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/tools/get-datetime.ts`, `src/tools/run-command.ts`, `src/tools/read-file.ts`, `src/tools/write-file.ts`, `src/tools/utils.ts`, `src/tools/list-directory.ts`, `src/tools/search-files.ts`, `src/agents/orchestrator.ts`, `src/agents/index.ts`, `src/agents/prompts/orchestrator.md`

---

## Code-Review Agent Activity

### 2026-04-12 (revision: stmtInsert modulo + deleteTransaction/saveTransaction en session-store)
- **Task Reviewed**: Implementacion de stmtInsert como constante de modulo en save-memory.ts; deleteMessagesStmt/deleteSessionStmt como props privadas del constructor; saveTransaction extraida al constructor en session-store.ts
- **Result**: CHANGES REQUIRED
- **Issues Found**: 1
  - Issue #1 (Medium): `src/agent/session-store.ts:135` — La transaccion de `delete()` sigue creandose dentro del cuerpo del metodo en cada llamada (`this.db.transaction(...)` dentro de `delete()`), contradiciendo el patron aplicado a `saveTransaction`. Mover `deleteTransaction` al constructor como propiedad privada con firma `(sessionId: string)`.
- **Files Reviewed**: `src/tools/save-memory.ts`, `src/agent/session-store.ts`, `src/tools/recall-memory.ts`

### 2026-04-12 (segunda ronda: verificacion fix deleteTransaction en session-store)
- **Task Reviewed**: Verificar que `deleteTransaction` fue movida al constructor como propiedad privada con firma `(sessionId: string)` y que `delete()` la invoca correctamente
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/agent/session-store.ts`

### 2026-04-18 (segunda ronda: verificacion 5 issues Orchestrator Agent Iteracion 1)
- **Task Reviewed**: Verificacion de los 5 issues corregidos tras la primera revision del Orchestrator Agent — ExtendedAgentConnection, requestPermission stub, ToolContext sub-agente con llm+onSubAgentChange, async execute en get-datetime, enum agent_id
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/agent/types.ts`, `src/agent/agent.ts`, `src/tools/types.ts`, `src/tools/invoke-agent.ts`, `src/tools/invoke-agent-loop.ts`, `src/tools/get-datetime.ts`, `src/tools/utils.ts`

### 2026-04-18 (segunda ronda Iteración 2: verificacion 2 issues bridge in-process)
- **Task Reviewed**: Verificacion de los 2 issues corregidos tras la primera revision de la Iteración 2 — PendingPermission con reject, cleanup() rechaza antes de clear, requestPermission captura reject; ServerMessage exportado desde bridge.ts e importado en direct-connection.ts sin duplicado
- **Result**: APPROVED
- **Issues Found**: 0
- **Files Reviewed**: `src/web/bridge.ts`, `src/web/direct-connection.ts`

---

## Code Agent Activity

### 2026-04-12 (prepared statements a nivel de modulo en save-memory y delete/save de session-store)
- **Task**: Tres mejoras de rendimiento via prepared statements
- **Files Modified**:
  - `src/tools/save-memory.ts`
  - `src/agent/session-store.ts`
- **Changes Summary**:
  - Cambio 1 (`save-memory.ts`): Declarado `stmtInsert = db.prepare("INSERT INTO memory ...")` como constante de modulo. `execute()` usa `stmtInsert.run(content, Date.now())` en lugar de `db.run(...)` con SQL en texto plano por cada invocacion.
  - Cambio 2a (`session-store.ts`): Añadidas propiedades privadas `deleteMessagesStmt` y `deleteSessionStmt` de tipo `Statement`, inicializadas en el constructor. `delete()` ahora usa `this.deleteMessagesStmt.run(sessionId)` y `this.deleteSessionStmt.run(sessionId)` dentro de la transaccion.
  - Cambio 2b (`session-store.ts`): Extraida la transaccion de `save()` al constructor como propiedad privada `saveTransaction` tipada con `ReturnType<Database["transaction"]>`. El callback acepta `(sessionId, now, msgs)` para evitar capturar variables por closure. `save()` queda reducida a `this.saveTransaction(sessionId, now, history)`.

---

### 2026-04-18 (Iteración 3 Orchestrator Agent — nueva UX frontend sin hub)
- **Task**: Implementar Iteración 3: el usuario va directamente al chat del orchestrator sin pantalla de selección de agente
- **Files Modified**:
  - `src/web/app.tsx`
  - `src/web/components/ChatView.tsx`
  - `src/web/components/SessionSidebar.tsx`
- **Changes Summary**:
  - `app.tsx`: Eliminado estado `currentView` hub/chat, `handleSelectAgent`, `handleSelectSession` y el import de `AgentHub`. Estado simplificado a un único `sessionId: string | null`. `handleBackToHub` renombrado a `handleNewSession` (resetea `sessionId` a `null`). La vista inicial es `ChatView` directamente con `agentId="orchestrator"` y `sessionId={sessionId}`. El componente quedó de 31 líneas (antes 67).
  - `ChatView.tsx`: `EmptyState` eliminado el prop `agentId` — el subtítulo ahora es hardcoded como texto genérico en español ("Tu asistente inteligente está listo"). El botón "Back" (← Back) convertido a "✦ Nueva conversación". Llamada a `SessionSidebar` sin pasar `agentId`. El prop `agentConfig?` se mantiene por compatibilidad con `useChatSession`.
  - `SessionSidebar.tsx`: Eliminado prop `agentId` de la interfaz y del cuerpo. El `useEffect` hace fetch hardcodeado a `/api/sessions?agentId=orchestrator` con dependencias vacías `[]`, eliminando así el filtro dinámico que ya no es necesario.
- **Tests**: 53/53 pasando.

### 2026-04-18 (fix 2 issues code-review: reject en PendingPermission y ServerMessage deduplicado)
- **Task**: Corregir Issue #1 (Promise de requestPermission nunca se rechaza al cerrar WebSocket) e Issue #2 (ServerMessage duplicado en bridge.ts y direct-connection.ts)
- **Files Modified**:
  - `src/web/bridge.ts`
  - `src/web/direct-connection.ts`
- **Changes Summary**:
  - Issue #1 (High): Añadido campo `reject: (reason?: unknown) => void` al tipo `PendingPermission` en `bridge.ts`. En `cleanup()`, bucle `for...of` que llama `pending.reject(new Error("WebSocket cerrado"))` antes de `.clear()`. En `direct-connection.ts`, la Promise de `requestPermission` pasa ahora `(resolve, reject)` al `set()` del Map.
  - Issue #2 (Medium): `ServerMessage` en `bridge.ts` pasado de `type` a `export type`. En `direct-connection.ts`, eliminada la definicion local de `ServerMessage` (7 lineas) e importada desde `./bridge.ts` junto con `BridgeData` y `PendingPermission` en la misma linea de import. Tests: 53/53 pasando.

### 2026-04-18 (Iteración 2 Orchestrator Agent — bridge in-process)
- **Task**: Implementar Iteración 2: el bridge ya no spawna subprocesos. OllamaAgent del orchestrator instanciado directamente in-process.
- **Files Modified/Created**:
  - `src/web/direct-connection.ts` (nuevo)
  - `src/web/bridge.ts`
- **Changes Summary**:
  - `src/web/direct-connection.ts`: Nueva clase `DirectConnection` que implementa `ExtendedAgentConnection`. Recibe `ws: Bun.ServerWebSocket<BridgeData>` y `pendingPermissions: Map<string, PendingPermission>`. `sessionUpdate()` traduce `SessionNotification` a mensajes WebSocket (lógica migrada de `WebSocketClient`). `requestPermission()` envía el mensaje al WebSocket y espera respuesta via Promise. `readTextFile()` y `writeTextFile()` son stubs. `createTerminal()` lanza error.
  - `src/web/bridge.ts`: Eliminada clase `WebSocketClient` (lógica migrada a `DirectConnection`). Eliminados imports de `node:child_process` y `node:stream`. Eliminado campo `agentProcess: ChildProcess`. Añadido campo `private agent: OllamaAgent | null`. Exportado tipo `PendingPermission` para uso en `DirectConnection`. `start()` ignora el `agentId` recibido y siempre instancia el orchestrator: crea `DirectConnection`, `OllamaAgent`, llama `initialize()`, y `newSession()` o `loadSession()`. `handlePrompt()` llama `this.agent.prompt()` directamente. `handleCancel()` llama `this.agent.cancel()`. `cleanup()` solo nullea `this.agent`.
- **Tests**: 53/53 pasando. `bunx tsc --noEmit` sin errores.

### 2026-04-18 (fix 5 issues code-review: ExtendedAgentConnection, requestPermission stub, ToolContext sub-agente, async execute, enum agent_id)
- **Task**: Corregir 5 issues reportados por code-review sobre el Orchestrator Agent (Iteración 1)
- **Files Modified**:
  - `src/agent/types.ts`
  - `src/agent/agent.ts`
  - `src/tools/types.ts`
  - `src/tools/utils.ts`
  - `src/tools/invoke-agent-loop.ts`
  - `src/tools/invoke-agent.ts`
  - `src/tools/get-datetime.ts`
  - `src/llm/types.ts`
- **Changes Summary**:
  - Issue #1 (Critical): Añadida `ExtendedAgentConnection` en `src/agent/types.ts` que extiende `AgentConnection` con `readTextFile`, `writeTextFile` y `createTerminal`. `ToolContext.connection` cambiado a `ExtendedAgentConnection` en `types.ts`. `runTerminal` en `utils.ts` cambiado de `acp.AgentSideConnection` a `ExtendedAgentConnection`. `agent.ts` actualizado para usar `ExtendedAgentConnection`. Añadida `ToolPropertySchema` en `llm/types.ts` con campo `enum?: string[]` para desbloquear el Issue #5.
  - Issue #2 (High): Stub `requestPermission` en `invoke-agent-loop.ts` corregido de `{ granted: false }` a `{ outcome: { outcome: "cancelled" } }` (tipo correcto de `RequestPermissionResponse` según el SDK).
  - Issue #3 (High): `runSubAgentLoop` en `invoke-agent-loop.ts` recibe nuevo parámetro `onSubAgentChange?: ToolContext["onSubAgentChange"]`; el `ToolContext` construido para cada tool call incluye `llm` y `onSubAgentChange`. `invoke-agent.ts` pasa `ctx.onSubAgentChange` a `runSubAgentLoop`. `agent.ts` propaga `llm: this.llm` al `toolRegistry.execute`.
  - Issue #4 (Medium): `execute` en `get-datetime.ts` declarado `async` con retorno `Promise<string>`.
  - Issue #5 (Low): `agent_id` en `invoke-agent.ts` añade `enum: ["coding", "writing", "research", "personal", "data", "devops"]` al schema JSON. Requirió extender `ToolPropertySchema` en `llm/types.ts`.
- **Tests**: 53/53 pasando. `bunx tsc --noEmit` sin errores.

### 2026-04-18 (Iteración 1 Orchestrator Agent — backend base)
- **Task**: Implementar Iteración 1 del Orchestrator Agent sin romper los 53 tests existentes
- **Files Modified/Created**:
  - `src/agent/types.ts` (nuevo)
  - `src/agent/agent.ts`
  - `src/tools/types.ts`
  - `src/tools/invoke-agent.ts` (nuevo)
  - `src/tools/invoke-agent-loop.ts` (nuevo)
  - `src/tools/index.ts`
  - `src/agents/prompts/orchestrator.md` (nuevo)
  - `src/agents/orchestrator.ts` (nuevo)
  - `src/agents/index.ts`
- **Changes Summary**:
  - `src/agent/types.ts`: Nueva interfaz `AgentConnection` (Dependency Inversion) que desacopla `OllamaAgent` del SDK concreto. Expone solo los dos métodos realmente usados: `sessionUpdate` y `requestPermission`.
  - `src/agent/agent.ts`: Cambiado `private connection: acp.AgentSideConnection` → `private connection: AgentConnection`. Añadido import de `AgentConnection` desde `./types.ts`. Sin cambios en lógica.
  - `src/tools/types.ts`: Añadidos campos opcionales `llm?: LLMProvider` y `onSubAgentChange?` a `ToolContext`. Cambiado tipo de `connection` de `acp.AgentSideConnection` a `AgentConnection`. Añadido import de `AgentConnection` y `LLMProvider`.
  - `src/tools/invoke-agent.ts`: Tool `invoke_agent` que resuelve el AgentConfig, construye el historial inicial, emite eventos `onSubAgentChange`, ejecuta el loop del sub-agente con `ctx.llm` y retorna el texto acumulado. Importaciones lazy (`await import(...)`) para romper la circularidad `tools/index → invoke-agent → agents/index → agents/registry → tools/index`.
  - `src/tools/invoke-agent-loop.ts`: Extracción del mini-loop LLM (SRP) para mantener `invoke-agent.ts` bajo 100 líneas. Ejecuta el loop LLM completo con tool calls, acumula texto y retorna el resultado.
  - `src/tools/index.ts`: Añadido import y `.register(invokeAgentTool)` al final.
  - `src/agents/prompts/orchestrator.md`: System prompt en español con personalidad amigable y directa, tabla de routing a 6 sub-agentes (coding, writing, research, personal, data, devops), reglas de cuándo responder directamente vs delegar, y regla explícita de no mencionar el nombre del sub-agente al usuario.
  - `src/agents/orchestrator.ts`: `AgentConfig` con id "orchestrator", tools: ["invoke_agent"], suggestedPrompts en español.
  - `src/agents/index.ts`: Añadido import de `orchestratorAgent` y `.register(orchestratorAgent)`.
- **Tests**: 53/53 pasando tras los cambios.

## Workflow Summary

The multi-agent workflow follows this pattern:

1. **Code** implements the task
2. **Code-Review** reviews the implementation
   - If issues found → loop back to **Code** to fix
   - If approved → continue
3. **Performance** analyzes for improvements
4. All agents update this memory file with their work

## Recent Activity History

### Code Agent Activity

#### 2026-04-12 (feature: historial de sesiones en AgentCard con dropdown inline - Opcion B1)
- **Task**: Integrar el historial de sesiones en AgentCard con dropdown inline; eliminar la seccion "Recent Sessions" de AgentHub
- **Files Modified**:
  - `src/web/components/AgentCard.tsx` (reescrito)
  - `src/web/components/AgentHub.tsx` (reescrito)
  - `src/web/components/AgentSessionGroup.tsx` (eliminado)
- **Changes Summary**:
  - `AgentCard.tsx`: Nuevas props `sessions: Session[]` y `onSelectSession`. Subcomponente `SessionDropdown` en el mismo archivo con posicionamiento `absolute` dentro de un contenedor `relative`. Boton principal `"N sessions ▾"` (`btn-primary`) cuando hay sesiones; "Start Chat" pasa a secundario (outline/ghost). Con 0 sesiones, solo "Start Chat" como primario. Cierre del dropdown via `useEffect` con listener `mousedown` sobre `document`, acotado con `ref`. `relativeTime` como funcion modulo-nivel en `AgentCard.tsx`.
  - `AgentHub.tsx`: Eliminados `AgentSessionGroup`, `sessionsByAgent`, `relativeTime`, `handleDelete`, `deletingId`. Cada `AgentCard` recibe `sessions={sessions.filter(s => s.agent_id === agent.id)}` y `onSelectSession`. Estructura simplificada a un unico `<section>`.
  - `AgentSessionGroup.tsx`: Eliminado — logica absorbida por el dropdown inline de `AgentCard`.

#### 2026-04-12
- **Task**: Mejorar el agente Writing con opcion A+B — enriquecer prompt del sistema y añadir tools disponibles
- **Files Modified**:
  - `src/agents/prompts/writing.md`
  - `src/agents/writing.ts`
- **Changes Summary**:
  - `writing.md`: Expandido de 1 linea a prompt completo con 6 roles especializados (proofreader, ghostwriter, SEO copywriter, copywriter, technical writer, academic editor), proceso estructurado en 3 pasos (analizar/sugerir/reescribir), guias de estilo para 4 registros (academico, profesional, creativo, tecnico), manejo de 5 formatos de documento (emails, articulos, propuestas, documentacion, redes sociales), y seccion de herramientas con instrucciones de uso para cada tool.
  - `writing.ts`: Añadidas tools `web_search`, `fetch_url`, `search_files`, `list_directory`, `get_datetime`. `suggestedPrompts` ampliados de 3 a 8 ejemplos variados y especificos.
