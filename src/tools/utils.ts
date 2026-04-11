import type * as acp from "@agentclientprotocol/sdk";

export async function runTerminal(
  connection: acp.AgentSideConnection,
  sessionId: string,
  toolCallId: string,
  command: string,
  args: string[],
  cwd?: string,
): Promise<{ output: string; exitCode: number | null }> {
  const terminal = await connection.createTerminal({ sessionId, command, args, cwd });

  await connection.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: "tool_call_update",
      toolCallId,
      status: "in_progress",
      content: [{ type: "terminal", terminalId: terminal.id }],
    },
  });

  await terminal.waitForExit();
  const result = await terminal.currentOutput();
  await terminal.release();

  return {
    output: result.output.trim(),
    exitCode: result.exitStatus?.exitCode ?? null,
  };
}
