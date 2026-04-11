import type { AgentConfig } from "./types.ts";

export const devopsAgent: AgentConfig = {
  id: "devops",
  name: "DevOps Assistant",
  description: "Help with deployment and infrastructure",
  icon: "🚀",
  audience: "technical",
  tools: [
    "read_file",
    "write_file",
    "run_command",
    "list_directory",
    "search_files",
  ],
  systemPromptFile: "devops.md",
  suggestedPrompts: [
    "Set up a Docker container",
    "Configure CI/CD pipeline",
    "Deploy this application",
  ],
};
