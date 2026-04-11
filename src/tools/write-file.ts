import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

export const writeFileTool: Tool = {
  kind: "edit",
  definition: {
    name: "write_file",
    description:
      "Write or overwrite a text file on the user's filesystem. Will ask the user for permission before writing.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute or relative path to the file to write" },
        content: { type: "string", description: "The full content to write to the file" },
      },
      required: ["path", "content"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const path = toolCall.arguments.path as string;

    const permission = await ctx.connection.requestPermission({
      sessionId: ctx.sessionId,
      toolCall: {
        toolCallId: toolCall.id,
        title: `Write file: ${path}`,
        kind: "edit",
        status: "pending",
        locations: [{ path }],
        rawInput: toolCall.arguments,
      },
      options: [
        { kind: "allow_once", name: "Allow write", optionId: "allow" },
        { kind: "reject_once", name: "Skip write", optionId: "reject" },
      ],
    });

    const rejected =
      permission.outcome.outcome === "cancelled" ||
      (permission.outcome.outcome === "selected" && permission.outcome.optionId === "reject");

    if (rejected) return "Write rejected by user.";

    await ctx.connection.writeTextFile({
      sessionId: ctx.sessionId,
      path,
      content: toolCall.arguments.content as string,
    });
    return "File written successfully.";
  },
};
