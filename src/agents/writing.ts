import type { AgentConfig } from "./types.ts";

export const writingAgent: AgentConfig = {
  id: "writing",
  name: "Writing Assistant",
  description: "Help with writing, editing, and improving text",
  icon: "✍️",
  audience: "all",
  tools: ["read_file", "write_file", "save_memory", "recall_memory"],
  systemPromptFile: "writing.md",
  suggestedPrompts: [
    "Improve the clarity of this paragraph",
    "Help me write a professional email",
    "Check the grammar and style",
  ],
};
