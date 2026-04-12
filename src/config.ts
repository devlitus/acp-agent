export const LLM_PROVIDER = process.env.LLM_PROVIDER ?? "ollama";

export const AGENT_ID = process.env.AGENT_ID ?? "coding";

// Ollama
export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:latest";

// Groq
export const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3-32b";
