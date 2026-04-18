import type { ExtendedAgentConnection } from "../agent/types.ts";

export async function readBodyCapped(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, maxBytes);

  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  const onAbort = () => reader.cancel().catch(() => {});
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalBytes += value.byteLength;
        if (totalBytes >= maxBytes) {
          reader.cancel().catch(() => {});
          break;
        }
      }
    }
  } catch (err) {
    reader.cancel().catch(() => {});
    throw err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  const totalSize = chunks.reduce((s, c) => s + c.byteLength, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(merged);
}

export async function runTerminal(
  connection: ExtendedAgentConnection,
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
