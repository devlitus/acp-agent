# Plan: Sistema de Memoria Persistente para ACP Agent

> Fecha: 2026-04-22
> Estado: Aprobado

## Estado actual

| Componente | Estado | Problema |
|---|---|---|
| `save-memory.ts` / `recall-memory.ts` | Funcional | SQL directo en tools (vierte Repository) |
| `auto-memory.ts` | Funcional | Desduplicacion debil (`LIKE` con 3 palabras) |
| Tabla `memory` | Funcional | Sin categorias, sin embeddings |
| System prompt (`coding.md`) | Menciona tools | **NO inyecta memorias al inicio** |
| `agent.ts:newSession()` | Crea sesion | No carga contexto de memoria |

El agente solo recuerda si **explicitamente llama a `recall_memory`**. No tiene contexto proactivo.

---

## Fase 1 — Inyeccion automatica + refactor Repository

**Objetivo:** El agente empieza cada sesion sabiendo cosas del usuario. Limpiar SQL de los tools.

### 1.1 Crear `src/agent/memory-store.ts` (Repository)

Nuevo archivo siguiendo el patron de `session-store.ts`:

```
class MemoryStore {
  save(content: string, category?: string, source?: string): void
  recall(keyword?: string): Memory[]
  recallRecent(limit: number): Memory[]
  exists(content: string): boolean
  hasSimilar(content: string): boolean
  count(): number
}
```

- Mueve la logica SQL de `save-memory.ts`, `recall-memory.ts` y `auto-memory.ts` aqui
- `MemoryStore` encapsula todo el acceso a la tabla `memory`
- Exporta singleton `memoryStore` como `SessionStore`

### 1.2 Refactorizar tools para usar `MemoryStore`

- `save-memory.ts`: delega a `memoryStore.save()`, sin importar `db`
- `recall-memory.ts`: delega a `memoryStore.recall()`, sin importar `db`
- `auto-memory.ts`: usa `memoryStore.save()` y `memoryStore.hasSimilar()`

Esto elimina las 3 importaciones directas de `db` en tools, cumpliendo Dependency Inversion.

### 1.3 Inyectar memorias en el system prompt

Modificar `agent/index.ts` (donde se construye el system prompt) o `agent.ts:newSession()`:

```typescript
const basePrompt = agentRegistry.getSystemPrompt(agentConfig);
const recentMemories = memoryStore.recallRecent(20);

const systemPrompt = recentMemories.length > 0
  ? `${basePrompt}\n\n## Facts you remember about this user:\n${recentMemories.map(m => `- ${m.content}`).join("\n")}`
  : basePrompt;
```

Regla de limites: Max 20 memorias, truncar si el system prompt + memorias > 8000 caracteres.

### 1.4 Mejorar desduplicacion en `hasSimilar()`

Reemplazar la logica actual de `LIKE` con:

1. Normalizar texto: minusculas, quitar puntuacion, quitar articulos comunes
2. Ordenar palabras alfabeticamente
3. Comparar con Jaccard similarity (interseccion/union de palabras) > 0.7

### Archivos Fase 1

| Archivo | Accion |
|---|---|
| `src/agent/memory-store.ts` | **Nuevo** (~80 lineas) |
| `src/tools/save-memory.ts` | Editar: usar `memoryStore` |
| `src/tools/recall-memory.ts` | Editar: usar `memoryStore` |
| `src/agent/auto-memory.ts` | Editar: usar `memoryStore` |
| `src/agent/agent.ts` o `src/agent/index.ts` | Editar: inyectar memorias en prompt |
| `src/agents/prompts/coding.md` | Editar: actualizar instruccion de memoria |

---

## Fase 2 — Categorias + Consolidacion

**Objetivo:** Las memorias tienen tipo. Las viejas se resumen para no acumular ruido.

### 2.1 Migracion: anadir `category` y `source` a la tabla `memory`

En `db.ts:migrate()`:

```sql
ALTER TABLE memory ADD COLUMN category TEXT;
ALTER TABLE memory ADD COLUMN source TEXT;  -- 'auto' o 'manual'
```

Categorias: `preference`, `personal`, `project`, `instruction`, `fact`

### 2.2 Actualizar `auto-memory.ts` para extraer categoria

Modificar el prompt de extraccion para que devuelva formato estructurado:

```
Extract facts worth remembering. Format each as: CATEGORY|fact
Categories: preference, personal, project, instruction, fact
```

Parsear la respuesta y guardar con categoria. Si no tiene formato, categoria = `fact`.

### 2.3 Crear `src/agent/memory-consolidator.ts`

Nuevo archivo con logica de consolidacion:

```typescript
function consolidate(memoryStore: MemoryStore, llm: LLMProvider): Promise<void>
```

**Trigger:** Se ejecuta cuando `memoryStore.count() > 100` (configurable).

**Proceso:**

1. Tomar las memorias mas antiguas (las ultimas 50 que no sean recientes)
2. Agrupar por categoria
3. Llamar al LLM con un prompt de consolidacion: *"Resume estos N hechos en 3-5 hechos de alto nivel"*
4. Guardar el resumen como una memoria nueva con `source: 'consolidated'`
5. Eliminar las memorias originales consolidadas

### 2.4 Priorizar memorias por categoria en el system prompt

Al inyectar memorias (Fase 1.3), priorizar:

1. `preference` e `instruction` primero
2. Luego `personal`
3. Luego `fact` y `project`
4. Consolidadas al final

### Archivos Fase 2

| Archivo | Accion |
|---|---|
| `src/db.ts` | Editar: migracion con `category`, `source` |
| `src/agent/memory-store.ts` | Editar: metodos con categoria, `deleteOld()`, `countByCategory()` |
| `src/agent/auto-memory.ts` | Editar: extraccion con categoria |
| `src/agent/memory-consolidator.ts` | **Nuevo** (~70 lineas) |
| `src/agent/agent.ts` | Editar: llamar consolidador despues de `extractAndSave` |

---

## Fase 3 — Busqueda semantica con Embeddings (Ollama)

**Objetivo:** Busqueda por significado, no por palabras clave. Reemplazar `LIKE` con similitud coseno.

### Modelo de embeddings: `nomic-embed-text-v2-moe`

| Propiedad | Valor |
|---|---|
| Modelo | `nomic-embed-text-v2-moe` |
| Parametros totales | 475M |
| Parametros activos (inferencia) | 305M (MoE: 8 experts, top-2 routing) |
| Dimension embedding | 768 (reducible a 256 via Matryoshka) |
| Max tokens entrada | 512 |
| Idiomas | ~100 (multilingue, entrenado con 1.6B pares) |
| Peso | ~305MB descarga |
| Licencia | Fully open-source (weights + code + training data) |
| Rendimiento | BEIR 52.86, MIRACL 65.80 (SOTA en su clase) |

**Best practices del modelo:**

- Prefijos obligatorios: `"search_query: "` para consultas, `"search_document: "` para documentos
- Input maximo: 512 tokens (truncar memorias largas)
- Para optimizar almacenamiento: usar 256 dimensiones (Matryoshka) con degradacion minima

### 3.1 Migracion: anadir `embedding` a la tabla `memory`

```sql
ALTER TABLE memory ADD COLUMN embedding BLOB;  -- Float32Array serializado (256 o 768 dims)
```

**Decision de dimensiones:** Usar 256 dimensiones por defecto (Matryoshka) para optimizar almacenamiento.
Cada embedding = 256 floats x 4 bytes = 1KB por memoria. Con 10k memorias = ~10MB, trivial para SQLite.

### 3.2 Crear `src/llm/embeddings.ts`

Nuevo archivo con `EmbeddingService`:

```typescript
class EmbeddingService {
  constructor(private url: string, private model: string) {}

  async embed(text: string, prefix?: "search_query" | "search_document"): Promise<Float32Array>
  async embedBatch(texts: string[], prefix?: "search_query" | "search_document"): Promise<Float32Array[]>
  cosineSimilarity(a: Float32Array, b: Float32Array): number
}
```

- Usa `POST http://localhost:11434/api/embeddings` (API nativa de Ollama)
- Model por defecto: `nomic-embed-text-v2-moe`
- Prefijos automaticos: `"search_document: "` al indexar, `"search_query: "` al buscar
- Truncar textos a 512 tokens antes de enviar (heuristica: ~2000 caracteres)
- Config en `config.ts`: `getOllamaEmbedModel()` con env var `OLLAMA_EMBED_MODEL`
- Dimension de salida: 256 (configurable via `OLLAMA_EMBED_DIM`)

### 3.3 Actualizar `MemoryStore` con busqueda semantica

Nuevo metodo:

```typescript
recallSemantic(query: string, limit: number): Promise<Memory[]>
```

1. Generar embedding del query con prefijo `"search_query: "`
2. Cargar todas las memorias con embedding (en memoria, son pocos miles)
3. Calcular similitud coseno contra todas
4. Devolver top-K por similitud (>0.5 threshold)

Para el volumen esperado (<10k memorias), brute-force es suficiente. Si algun dia crece, se migra a `sqlite-vec`.

### 3.4 Generar embedding al guardar

En `MemoryStore.save()`:

1. Guardar el texto
2. En background (no bloquear): generar embedding con prefijo `"search_document: "` y actualizar la fila

En `auto-memory.ts`: lo mismo, generar embeddings despues de guardar.

### 3.5 Backfill de memorias existentes

Script o logica lazy:

- Al arrancar el agente, si hay memorias sin embedding, generarlas en batch
- O lazily: generar embedding la primera vez que se hace una busqueda semantica

### 3.6 Actualizar `recall_memory` tool

Anadir parametro `mode`:

- `"keyword"` (por defecto si no hay modelo de embeddings): LIKE actual
- `"semantic"` (por defecto si embeddings disponibles): busqueda por similitud

El system prompt se actualiza para priorizar recall semantico.

### 3.7 Actualizar config.ts

```typescript
export const getOllamaEmbedModel = (): string => process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text-v2-moe";
export const getOllamaEmbedDim = (): number => Number(process.env.OLLAMA_EMBED_DIM ?? "256");
```

### Archivos Fase 3

| Archivo | Accion |
|---|---|
| `src/db.ts` | Editar: migracion con `embedding` |
| `src/llm/embeddings.ts` | **Nuevo** (~70 lineas) |
| `src/config.ts` | Editar: `getOllamaEmbedModel()`, `getOllamaEmbedDim()` |
| `src/agent/memory-store.ts` | Editar: `recallSemantic()`, embedding en `save()` |
| `src/tools/recall-memory.ts` | Editar: modo semantic |
| `src/agent/agent.ts` | Editar: inyeccion semantica en prompt |

---

## Dependencias entre fases

```
Fase 1 (base)  -->  Fase 2 (inteligencia)  -->  Fase 3 (semantica)
   |                      |                          |
   + memory-store.ts      + categories               + embeddings.ts
   + inyeccion prompt     + consolidator             + cosine search
   + refactor tools       + priorizacion             + backfill
```

Cada fase es incremental y funcional por si sola. Si paramos en Fase 1, ya hay valor real. Si paramos en Fase 2, tenemos memoria inteligente. La Fase 3 anade precision semantica.

## Principios respetados

- **SRP**: Cada archivo nuevo tiene una unica responsabilidad (`MemoryStore` = acceso a datos, `EmbeddingService` = generar vectores, `MemoryConsolidator` = resumir)
- **OCP**: Tools no se editan para anadir funcionalidad de memoria, solo cambian sus dependencias internas
- **DIP**: `auto-memory.ts` y `agent.ts` dependen de `MemoryStore` (abstraccion), no de `db` directamente
- **File-size rule**: Ningun archivo nuevo supera 100 lineas
- **Registry/Repository**: Se sigue el patron existente de `SessionStore`
