/**
 * Gestión de la configuración persistente en ~/.acp-agent/config.json.
 * S — Responsabilidad única: leer y escribir config en disco.
 * D — Depende de detectLLM (abstracción), no de implementaciones concretas.
 */

import { join } from "node:path";
import { detectLLM } from "./llm/detector.ts";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
export const CONFIG_DIR = join(HOME, ".acp-agent");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

/** Permite sobreescribir la ruta de config en tests. */
let _configPath = CONFIG_PATH;
export function _setConfigPathForTest(path: string): void {
  _configPath = path;
}

export type AppConfig = {
  provider: "ollama" | "lm-studio" | "groq";
  baseUrl: string;
  model: string;
};

async function ensureConfigDir(): Promise<void> {
  const dir = join(_configPath, "..");
  await Bun.$`mkdir -p ${dir}`.quiet();
}

export async function readConfig(): Promise<AppConfig | null> {
  try {
    const file = Bun.file(_configPath);
    const exists = await file.exists();
    if (!exists) return null;
    return await file.json() as AppConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(_configPath, JSON.stringify(config, null, 2));
}

async function isLLMReachable(config: AppConfig): Promise<boolean> {
  // Para Groq no hay detección local
  if (config.provider === "groq") return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const testUrl = config.provider === "ollama"
      ? `${config.baseUrl}/api/tags`
      : `${config.baseUrl}/v1/models`;
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Carga la config desde disco; si no existe o el LLM ya no responde,
 * vuelve a detectar y persiste el resultado.
 * Devuelve null si no hay ningún LLM disponible.
 */
export async function loadOrDetectConfig(): Promise<AppConfig | null> {
  // 1. Las env vars siempre tienen prioridad (usuarios avanzados).
  // Solo saltamos la detección para Groq (requiere API key remota, sin sentido detectar local).
  if (process.env.LLM_PROVIDER === "groq") {
    return null; // Deja que config.ts gestione los overrides de env
  }

  // 2. Intentar leer config guardada
  const saved = await readConfig();
  if (saved && await isLLMReachable(saved)) {
    return saved;
  }

  // 3. Auto-detección
  const detected = await detectLLM();
  if (!detected) return null;

  const defaultModel = detected.models[0] ?? "gemma4:latest";
  const config: AppConfig = {
    provider: detected.provider,
    baseUrl: detected.baseUrl,
    model: defaultModel,
  };
  await writeConfig(config);
  return config;
}
