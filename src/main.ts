/**
 * Entry point único para instalación local.
 * Orquesta: config → servidor web → apertura de navegador.
 * S — Responsabilidad única: arranque y cierre limpio de la aplicación.
 */

import { loadOrDetectConfig } from "./config-file.ts";
import { createServer, setSetupRequired } from "./web/server.ts";

const PORT = Number(process.env.PORT ?? 3000);
const APP_URL = `http://localhost:${PORT}`;

async function openBrowser(url: string): Promise<void> {
  try {
    const platform = process.platform;
    const cmd = platform === "darwin" ? "open"
      : platform === "win32" ? "cmd"
      : "xdg-open";
    const args = platform === "win32" ? ["/c", "start", url] : [url];
    Bun.spawn([cmd, ...args], { stdout: "ignore", stderr: "ignore" });
  } catch {
    // No crítico si falla la apertura del navegador
  }
}

function printStartupMessage(
  config: { provider: string; model: string } | null,
): void {
  console.log("");
  console.log(`  ACP Agent corriendo en ${APP_URL}`);
  if (config) {
    const labels: Record<string, string> = { ollama: "Ollama", "lm-studio": "LM Studio", groq: "Groq" };
    const providerLabel = labels[config.provider] ?? config.provider;
    console.log(`  Usando ${providerLabel} con ${config.model}`);
  } else {
    console.log("  No se detectó ningún LLM. Abre el navegador para configurarlo.");
  }
  console.log("");
}

async function main(): Promise<void> {
  // 1. Cargar o detectar configuración
  const config = await loadOrDetectConfig();

  // 2. Si hay config, inyectar en process.env para que config.ts la recoja
  if (config) {
    process.env.LLM_PROVIDER = config.provider;
    if (config.provider === "ollama") {
      process.env.OLLAMA_URL = config.baseUrl;
      process.env.OLLAMA_MODEL = config.model;
    } else if (config.provider === "lm-studio") {
      process.env.LM_STUDIO_URL = config.baseUrl;
      process.env.LM_STUDIO_MODEL = config.model;
    }
  }

  // 3. Arrancar el servidor web
  setSetupRequired(config === null);
  const server = createServer(PORT);

  // 4. Mensaje amigable en terminal
  printStartupMessage(config);

  // 5. Abrir navegador automáticamente
  await openBrowser(APP_URL);

  // 6. Cierre limpio
  function shutdown(): void {
    console.log("\n  Cerrando ACP Agent...");
    server.stop(true);
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Error fatal al arrancar:", err);
  process.exit(1);
});
