import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { runTerminal } from "./utils.ts";

export const listDirectoryTool: Tool = {
  kind: "read",
  definition: {
    name: "list_directory",
    description: "List the contents of a directory on the user's filesystem. Returns file names, sizes, and permissions.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute or relative path to the directory to list" },
      },
      required: ["path"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const path = toolCall.arguments.path as string;
    const { output, exitCode } = await runTerminal(
      ctx.connection, ctx.sessionId, toolCall.id, "ls", ["-la", path],
    );
    if (exitCode !== 0 && exitCode !== null) return `ls error (exit code ${exitCode})\n${output}`;
    return output || "(empty directory)";
  },
};
