import type { AgentConfig } from "./types.ts";

export const researchAgent: AgentConfig = {
  id: "research",
  name: "Research Assistant",
  description: "Search the web, read articles, and synthesize information on any topic.",
  icon: "🔍",
  audience: "all",
  tools: [
    "web_search",
    "fetch_url",
    "write_file",
    "save_memory",
    "recall_memory",
  ],
  systemPromptFile: "research.md",
  suggestedPrompts: [
    "Search for the latest news on AI regulation in Europe",
    "What are the best practices for TypeScript in 2025?",
    "Summarize the key findings of the 2024 State of JS survey",
  ],
};
