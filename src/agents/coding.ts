import type { AgentConfig } from "./types.ts";

export const codingAgent: AgentConfig = {
  id: "coding",
  name: "Coding Assistant",
  description: "Help with code, debugging, and file operations",
  icon: "💻",
  audience: "technical",
  tools: [
    "read_file",
    "write_file",
    "run_command",
    "list_directory",
    "search_files",
    "save_memory",
    "recall_memory",
  ],
  systemPromptFile: "coding.md",
  suggestedPrompts: [
    "Help me debug this error",
    "Refactor this function",
    "Explain how this code works",
  ],
};
