import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { db } from "../db.ts";

export const recallMemoryTool: Tool = {
  kind: "read",
  definition: {
    name: "recall_memory",
    description: "Retrieve previously saved memories. Optionally filter by keyword.",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Optional keyword to filter memories (case-insensitive substring match)" },
      },
      required: [],
    },
  },
  async execute(toolCall: ToolCall, _ctx: ToolContext): Promise<string> {
    const keyword = toolCall.arguments.keyword as string | undefined;
    const rows = keyword
      ? db.query("SELECT id, content FROM memory WHERE content LIKE ? ORDER BY created_at DESC").all(`%${keyword}%`)
      : db.query("SELECT id, content FROM memory ORDER BY created_at DESC").all();

    const typed = rows as { id: number; content: string }[];
    return typed.length === 0
      ? "(no memories stored)"
      : typed.map((r) => `[${r.id}] ${r.content}`).join("\n");
  },
};
