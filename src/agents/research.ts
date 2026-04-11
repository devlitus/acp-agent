import type { AgentConfig } from "./types.ts";

export const researchAgent: AgentConfig = {
  id: "research",
  name: "Research Assistant",
  description: "Help research topics and gather information",
  icon: "🔍",
  audience: "all",
  tools: [
    "write_file",
    "save_memory",
    "recall_memory",
  ],
  systemPromptFile: "research.md",
  suggestedPrompts: [
    "Help me organize my research notes",
    "Summarize what I've told you",
    "Remember this for later",
  ],
};
