# Plan: Instalación local para usuarios no técnicos

## Objetivo

Convertir el proyecto en una aplicación descargable de un solo archivo,
pensada para usuarios que usan Ollama o LM Studio en local y no tienen
conocimientos técnicos. Configuración mínima, cero terminal obligatoria.

## Flujo de usuario final

```
1. Abre Ollama o LM Studio (ya lo tienen instalado)
2. Descarga el binario acp-agent para su sistema operativo
3. Ejecuta el archivo → el navegador se abre automáticamente
4. Empieza a chatear
```

## Fases de implementación

### Fase 1 — Detector de LLM (`src/llm/detector.ts`)

Detectar automáticamente qué proveedor está activo en local.

**Lógica:**
- Probar `http://localhost:11434/api/tags` → Ollama
- Probar `http://localhost:1234/v1/models` → LM Studio (API compatible con OpenAI)
- Devolver: proveedor detectado + lista de modelos disponibles
- Si ninguno responde: devolver `null` (el usuario verá la página de setup)

**Contrato:**
```ts
type DetectedLLM = {
  provider: "ollama" | "lm-studio";
  baseUrl: string;
  models: string[];
};

async function detectLLM(): Promise<DetectedLLM | null>
```

---

### Fase 2 — Config persistente (`~/.acp-agent/config.json`)

Guardar la detección para no repetirla en cada arranque.

**Lógica:**
- Primera ejecución: correr `detectLLM()`, guardar resultado en `~/.acp-agent/config.json`
- Ejecuciones siguientes: leer config del archivo
- Si el archivo no existe o el LLM ya no responde: volver a detectar
- El usuario puede cambiar el modelo desde la UI (se persiste en el mismo archivo)

**Estructura del archivo:**
```json
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "gemma4:latest"
}
```

**Integrar con `src/config.ts`:** reemplazar las variables de entorno hardcoded
por lectura del archivo de config. Las env vars siguen funcionando como override
para usuarios avanzados.

---

### Fase 3 — Entry point único (`src/main.ts`)

Reemplazar los dos scripts separados (`agent` y `server`) con un solo
archivo que orquesta el arranque completo.

**Responsabilidades:**
1. Leer/generar config (Fase 2)
2. Arrancar el servidor web (`createServer()`)
3. Abrir el navegador automáticamente: `Bun.openInBrowser("http://localhost:3000")`
4. Manejar cierre limpio (SIGINT/SIGTERM)
5. Mostrar en terminal un mensaje mínimo y amigable:
   ```
   ✓ ACP Agent corriendo en http://localhost:3000
   ✓ Usando Ollama con gemma4:latest
   ```

**Cambio en `package.json`:**
```json
"scripts": {
  "start": "bun run src/main.ts",
  "build": "bun build --compile src/main.ts --outfile dist/acp-agent",
  "dev": "vite"
}
```

---

### Fase 4 — Página de setup en el navegador

Si `detectLLM()` devuelve `null`, en vez de crashear en terminal,
el servidor arranca igualmente y la web muestra una pantalla de ayuda.

**Componente: `src/web/components/SetupPage.tsx`**

Contenido:
- Mensaje claro: "No se detectó Ollama ni LM Studio"
- Instrucciones cortas para instalar/arrancar Ollama
- Botón "Reintentar" (llama a `/api/setup/detect` y recarga si tiene éxito)

**Endpoint necesario:** `GET /api/setup/detect`
- Vuelve a correr `detectLLM()`
- Si detecta: guarda config y devuelve `{ ok: true, provider, model }`
- Si no: devuelve `{ ok: false }`

---

### Fase 5 — Binario compilado

```bash
bun build --compile src/main.ts --outfile dist/acp-agent
```

Bun embebe todos los assets (HTML, CSS, JS del frontend) dentro del ejecutable.
El resultado es un único binario sin dependencias externas.

**Verificar antes de implementar:**
- Que `import indexHtml from "./index.html"` funciona correctamente con `--compile`
- Que los assets estáticos quedan embebidos
- Eliminar `development: { hmr: true }` del servidor en modo producción

---

### Fase 6 — GitHub Actions (releases automáticos)

Al crear un tag `v*.*.*`, el workflow construye y publica los binarios.

**Targets:**
| SO | Arquitectura | Flag de Bun |
|---|---|---|
| Linux | x64 | `--target=bun-linux-x64` |
| macOS | arm64 (Apple Silicon) | `--target=bun-darwin-arm64` |
| macOS | x64 (Intel) | `--target=bun-darwin-x64` |
| Windows | x64 | `--target=bun-windows-x64` |

**Archivo:** `.github/workflows/release.yml`

Pasos del workflow:
1. Checkout del repo
2. Instalar Bun
3. `bun install`
4. Build para cada target
5. Subir binarios a GitHub Releases

---

## Orden de implementación

| # | Tarea | Archivo(s) | Dependencias |
|---|---|---|---|
| 1 | Detector de LLM | `src/llm/detector.ts` | — |
| 2 | Config persistente | `src/config.ts` (refactor) | Fase 1 |
| 3 | Entry point único | `src/main.ts` | Fase 2 |
| 4 | Página de setup | `src/web/components/SetupPage.tsx` + endpoint | Fase 1 |
| 5 | Script de build | `package.json` | Fase 3 |
| 6 | GitHub Actions | `.github/workflows/release.yml` | Fase 5 |

## Decisiones de diseño

- **Sin Electron/Tauri**: innecesario, el navegador ya es la UI
- **Sin Docker**: añade complejidad para el usuario final
- **Env vars siguen funcionando**: compatibilidad hacia atrás para usuarios avanzados
- **Un solo proceso**: el bridge ya corre el agente en-process, no hay subprocess
- **LM Studio**: compatible con la API de OpenAI, se reutiliza `openai-stream.ts`
