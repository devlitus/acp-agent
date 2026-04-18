/**
 * Detector de proveedores LLM locales.
 * Detecta automáticamente si Ollama o LM Studio están disponibles.
 * S — Responsabilidad única: sólo detecta, no guarda ni configura.
 */

export type DetectedLLM = {
  provider: "ollama" | "lm-studio";
  baseUrl: string;
  models: string[];
};

const OLLAMA_URL = "http://localhost:11434";
const LM_STUDIO_URL = "http://localhost:1234";
const FETCH_TIMEOUT_MS = 2000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function detectOllama(): Promise<DetectedLLM | null> {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return null;
    const data = await res.json() as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m) => m.name);
    return { provider: "ollama", baseUrl: OLLAMA_URL, models };
  } catch {
    return null;
  }
}

async function detectLMStudio(): Promise<DetectedLLM | null> {
  try {
    const res = await fetchWithTimeout(`${LM_STUDIO_URL}/v1/models`);
    if (!res.ok) return null;
    const data = await res.json() as { data?: { id: string }[] };
    const models = (data.data ?? []).map((m) => m.id);
    return { provider: "lm-studio", baseUrl: LM_STUDIO_URL, models };
  } catch {
    return null;
  }
}

/**
 * Detecta Ollama y LM Studio en paralelo para minimizar latencia.
 * Prefiere Ollama si ambos responden.
 * Devuelve null si ninguno responde.
 */
export async function detectLLM(): Promise<DetectedLLM | null> {
  const [ollama, lmStudio] = await Promise.all([detectOllama(), detectLMStudio()]);
  return ollama ?? lmStudio;
}
