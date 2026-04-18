# ACP Agent Platform

A multi-agent web platform built with [ACP (Agent Communication Protocol)](https://agentclientprotocol.com),
TypeScript, and Bun. Users pick a specialized agent from a hub and chat with it in real time.
The agent can use tools (read files, run commands, search the web) and requests permission before
any destructive action.

## Installation

### Opción A — Binario compilado (usuarios finales)

Descarga el binario para tu sistema desde la [página de Releases](https://github.com/devlitus/acp-agent/releases):

| Sistema | Archivo |
|---------|---------|
| Linux x64 | `acp-agent-linux-x64` |
| macOS Apple Silicon | `acp-agent-macos-arm64` |
| macOS Intel | `acp-agent-macos-x64` |
| Windows x64 | `acp-agent-windows-x64.exe` |

Ejecuta el binario:

```bash
# Linux / macOS
chmod +x acp-agent-linux-x64
./acp-agent-linux-x64

# Windows
acp-agent-windows-x64.exe
```

El navegador se abre automáticamente en `http://localhost:3000`. Si tienes Ollama o LM Studio corriendo, ACP Agent los detecta solo — no hace falta configurar nada.

---

### Opción B — Desde el código fuente (desarrolladores)

**Requisitos previos**

- [Bun](https://bun.sh) ≥ 1.x
- Un proveedor LLM local o en la nube (ver sección siguiente)

**Pasos**

```bash
git clone https://github.com/devlitus/acp-agent.git
cd acp-agent
bun install
```

---

## Configuración del proveedor LLM

### Ollama (local, por defecto)

1. Instala [Ollama](https://ollama.ai)
2. Descarga un modelo:
   ```bash
   ollama pull gemma4
   # o cualquier otro modelo compatible
   ```
3. Arranca Ollama (si no está ya en ejecución):
   ```bash
   ollama serve
   ```

No necesitas crear ningún `.env` — ACP Agent detecta Ollama en `localhost:11434` automáticamente.

### LM Studio (local)

1. Instala [LM Studio](https://lmstudio.ai)
2. Carga un modelo y activa el servidor local desde la pestaña **Developer** (puerto 1234 por defecto)

ACP Agent detecta LM Studio automáticamente. Si usas un puerto distinto, crea un `.env`:

```env
LM_STUDIO_URL=http://localhost:1234
```

### Groq (API en la nube)

1. Obtén una API key en [console.groq.com](https://console.groq.com)
2. Crea un archivo `.env` en la raíz del proyecto:
   ```env
   LLM_PROVIDER=groq
   GROQ_API_KEY=tu_clave_aqui
   ```

---

## Ejecución

```bash
bun run start
```

Abre el navegador automáticamente en `http://localhost:3000` y muestra en terminal qué proveedor LLM está usando.

```bash
# Modo desarrollo con hot-reload
bun run dev

# Solo el servidor web (sin abrir navegador)
bun run server
```

### Cliente CLI (opcional)

```bash
bun run client
```

Cliente de terminal para probar el agente directamente sin UI web.

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto para sobreescribir los valores por defecto.

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `LLM_PROVIDER` | `ollama` | Proveedor LLM: `ollama`, `lm-studio` o `groq` |
| `OLLAMA_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `OLLAMA_MODEL` | `gemma4:latest` | Modelo de Ollama |
| `LM_STUDIO_URL` | `http://localhost:1234` | URL del servidor LM Studio |
| `LM_STUDIO_MODEL` | — | Modelo de LM Studio (se detecta automáticamente) |
| `GROQ_API_KEY` | — | Requerida cuando `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | `qwen/qwen3-32b` | Modelo de Groq |
| `PORT` | `3000` | Puerto del servidor web |

Bun carga `.env` automáticamente — no necesitas instalar dotenv.

## Contribuciones
¡Contribuciones bienvenidas! Si quieres agregar un nuevo agente, mejorar la interfaz o integrar otro proveedor LLM, abre un issue o haz un pull request.
