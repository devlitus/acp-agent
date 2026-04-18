/**
 * Configuración del agente.
 * Las variables de entorno tienen prioridad sobre la config persistente
 * (compatibilidad hacia atrás para usuarios avanzados).
 *
 * Se usan getters en lugar de constantes para que las mutaciones de
 * process.env (realizadas en main.ts al cargar config desde disco)
 * sean visibles en cada llamada.
 */

export const getLLMProvider = (): string => process.env.LLM_PROVIDER ?? "ollama";
export const getAgentId = (): string => process.env.AGENT_ID ?? "coding";

// Ollama
export const getOllamaUrl = (): string => process.env.OLLAMA_URL ?? "http://localhost:11434";
export const getOllamaModel = (): string => process.env.OLLAMA_MODEL ?? "gemma4:latest";

// Groq
export const getGroqApiKey = (): string => process.env.GROQ_API_KEY ?? "";
export const getGroqModel = (): string => process.env.GROQ_MODEL ?? "qwen/qwen3-32b";

// LM Studio (compatible con OpenAI)
export const getLMStudioUrl = (): string => process.env.LM_STUDIO_URL ?? "http://localhost:1234";
export const getLMStudioModel = (): string => process.env.LM_STUDIO_MODEL ?? "";

