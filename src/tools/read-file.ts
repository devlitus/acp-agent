import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

export const readFileTool: Tool = {
  kind: "read",
  definition: {
    name: "read_file",
    description: "Read the contents of a text file from the user's filesystem.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute or relative path to the file to read" },
      },
      required: ["path"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const path = toolCall.arguments.path as string;
    const response = await ctx.connection.readTextFile({ sessionId: ctx.sessionId, path });
    return response.content;
  },
};
