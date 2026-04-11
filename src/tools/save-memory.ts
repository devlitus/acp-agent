import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { db } from "../db.ts";

export const saveMemoryTool: Tool = {
  kind: "edit",
  definition: {
    name: "save_memory",
    description:
      "Save a fact, note, or important piece of information to persistent memory. Use this when the user asks you to remember something, or when you learn something worth keeping across sessions.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact or note to remember" },
      },
      required: ["content"],
    },
  },
  async execute(toolCall: ToolCall, _ctx: ToolContext): Promise<string> {
    const content = toolCall.arguments.content as string;
    db.run("INSERT INTO memory (content, created_at) VALUES (?, ?)", [content, Date.now()]);
    return "Memory saved.";
  },
};
