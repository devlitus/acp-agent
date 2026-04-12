import type { AgentConfig } from "./types.ts";

export const writingAgent: AgentConfig = {
  id: "writing",
  name: "Writing Assistant",
  description: "Help with writing, editing, and improving text",
  icon: "✍️",
  audience: "all",
  tools: [
    "read_file",
    "write_file",
    "save_memory",
    "recall_memory",
    "web_search",
    "fetch_url",
    "get_datetime",
  ],
  systemPromptFile: "writing.md",
  suggestedPrompts: [
    "Improve the clarity and flow of this paragraph",
    "Help me write a professional email to decline a meeting",
    "Draft a blog post about [topic] with SEO in mind",
    "Rewrite this text in a more formal academic tone",
    "Create a project proposal for [idea] with executive summary",
    "Fix the grammar and style of this document",
    "Write a technical README for my project",
    "Turn these bullet points into a polished LinkedIn post",
  ],
};
