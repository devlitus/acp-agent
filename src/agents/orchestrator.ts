import type { AgentConfig } from "./types.ts";

export const orchestratorAgent: AgentConfig = {
  id: "orchestrator",
  name: "ACP Assistant",
  description: "Tu asistente inteligente para cualquier tarea",
  icon: "◈",
  audience: "all",
  tools: ["invoke_agent"],
  systemPromptFile: "orchestrator.md",
  suggestedPrompts: [
    "Ayúdame a depurar este error",
    "Busca las últimas noticias sobre...",
    "Escribe un email profesional para...",
  ],
};
