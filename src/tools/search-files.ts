import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { runTerminal } from "./utils.ts";

export const searchFilesTool: Tool = {
  kind: "read",
  definition: {
    name: "search_files",
    description:
      "Search for a text pattern across files using grep. Returns matching lines with file names and line numbers. Does not require user permission.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regular expression pattern to search for" },
        path: { type: "string", description: "Directory or file to search in (defaults to current directory)" },
        glob: { type: "string", description: "File glob pattern to restrict the search (e.g. '*.ts', '*.{ts,js}')" },
      },
      required: ["pattern"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const pattern = toolCall.arguments.pattern as string;
    const searchPath = (toolCall.arguments.path as string | undefined) ?? ".";
    const glob = toolCall.arguments.glob as string | undefined;

    const args = ["-rn", "--color=never"];
    if (glob) args.push("--include", glob);
    args.push(pattern, searchPath);

    const { output, exitCode } = await runTerminal(
      ctx.connection, ctx.sessionId, toolCall.id, "grep", args,
    );

    if (exitCode === 0) return output;
    if (exitCode === 1) return "(no matches found)";
    return `grep error (exit code ${exitCode})\n${output}`;
  },
};
