import type { AgentConfig } from "./types.ts";

export const personalAgent: AgentConfig = {
  id: "personal",
  name: "Personal Assistant",
  description: "Help with everyday tasks and organization",
  icon: "🤖",
  audience: "all",
  tools: ["save_memory", "recall_memory", "write_file", "read_file"],
  systemPromptFile: "personal.md",
  suggestedPrompts: [
    "Remember this for later",
    "What did I ask you to remember?",
    "Help me organize my thoughts",
  ],
};
