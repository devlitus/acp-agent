import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { runTerminal } from "./utils.ts";

export const runCommandTool: Tool = {
  kind: "execute",
  definition: {
    name: "run_command",
    description:
      "Execute a shell command in the user's environment. Requires user permission before running. Use for running tests, installing packages, building, etc. Do NOT use for reading files or searching — use read_file, list_directory, or search_files instead.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to execute (passed to sh -c)" },
        cwd: { type: "string", description: "Working directory for the command (optional)" },
      },
      required: ["command"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const command = toolCall.arguments.command as string;
    const cwd = toolCall.arguments.cwd as string | undefined;

    const permission = await ctx.connection.requestPermission({
      sessionId: ctx.sessionId,
      toolCall: {
        toolCallId: toolCall.id,
        title: `Run: ${command}`,
        kind: "execute",
        status: "pending",
        locations: cwd ? [{ path: cwd }] : [],
        rawInput: toolCall.arguments,
      },
      options: [
        { kind: "allow_once", name: "Run command", optionId: "allow" },
        { kind: "reject_once", name: "Skip", optionId: "reject" },
      ],
    });

    const rejected =
      permission.outcome.outcome === "cancelled" ||
      (permission.outcome.outcome === "selected" && permission.outcome.optionId === "reject");

    if (rejected) return "Command execution rejected by user.";

    const { output, exitCode } = await runTerminal(
      ctx.connection, ctx.sessionId, toolCall.id, "sh", ["-c", command], cwd,
    );

    return exitCode !== 0 && exitCode !== null ? `Exit code ${exitCode}\n${output}` : output || "(no output)";
  },
};
