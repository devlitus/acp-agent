import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { memoryStore } from "../agent/memory-store.ts";

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
    const memories = memoryStore.recall(keyword);

    return memories.length === 0
      ? "(no memories stored)"
      : memories.map(m => `[${m.id}] ${m.content}`).join("\n");
  },
};
