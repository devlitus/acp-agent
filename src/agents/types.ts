export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  audience: "all" | "technical" | "mixed";
  tools: string[];
  systemPromptFile: string;
  suggestedPrompts: string[];
}
