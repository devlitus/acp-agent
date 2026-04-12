import type { AgentConfig } from "./types.ts";

export const personalAgent: AgentConfig = {
  id: "personal",
  name: "Personal Assistant",
  description: "Help with everyday tasks and organization",
  icon: "🤖",
  audience: "all",
  tools: [
    "save_memory",
    "recall_memory",
    "write_file",
    "read_file",
    "list_directory",
    "web_search",
    "fetch_url",
    "get_datetime",
  ],
  systemPromptFile: "personal.md",
  suggestedPrompts: [
    "What do you remember about me?",
    "Create a to-do list for today",
    "Take a note: ...",
    "Help me organize my thoughts on...",
    "Draft a quick summary of...",
  ],
};
