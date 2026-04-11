import type { AgentConfig } from "./types.ts";

export const dataAgent: AgentConfig = {
  id: "data",
  name: "Data Analyst",
  description: "Help analyze data and process files",
  icon: "📊",
  audience: "mixed",
  tools: [
    "read_file",
    "write_file",
    "run_command",
    "list_directory",
    "search_files",
  ],
  systemPromptFile: "data.md",
  suggestedPrompts: [
    "Analyze this CSV file",
    "Generate a summary report",
    "Extract insights from this data",
  ],
};
