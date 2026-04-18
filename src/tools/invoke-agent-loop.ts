import type { LLMProvider, Message } from "../llm/types.ts";
import type { ToolRegistry } from "./registry.ts";
import type { ToolContext } from "./types.ts";
import type { ExtendedAgentConnection } from "../agent/types.ts";

/** Stub de connection para sub-agentes ejecutados in-process. */
const subAgentConnection: ExtendedAgentConnection = {
  sessionUpdate: async () => {},
  requestPermission: async () => ({ outcome: { outcome: "cancelled" } }),
  readTextFile: async () => { throw new Error("readTextFile no disponible en sub-agentes in-process"); },
  writeTextFile: async () => { throw new Error("writeTextFile no disponible en sub-agentes in-process"); },
  createTerminal: async () => { throw new Error("createTerminal no disponible en sub-agentes in-process"); },
};

/**
 * Ejecuta el loop LLM de un sub-agente hasta que no haya más tool calls.
 * Retorna el texto acumulado del sub-agente.
 */
export async function runSubAgentLoop(
  llm: LLMProvider,
  history: Message[],
  toolRegistry: ToolRegistry,
  sessionId: string,
  signal: AbortSignal,
  onSubAgentChange?: ToolContext["onSubAgentChange"],
): Promise<string> {
  let accumulated = "";

  while (true) {
    let assistantText = "";

    const { toolCalls } = await llm.call(
      history,
      toolRegistry.definitions,
      signal,
      async (chunk) => {
        assistantText += chunk;
        accumulated += chunk;
      },
    );

    if (!toolCalls || toolCalls.length === 0) {
      history.push({ role: "assistant", content: assistantText });
      break;
    }

    history.push({
      role: "assistant",
      content: null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    });

    for (const toolCall of toolCalls) {
      let result: string;
      try {
        result = await toolRegistry.execute(
          toolCall,
          { sessionId, connection: subAgentConnection, signal, llm, onSubAgentChange },
        );
      } catch (err) {
        result = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
      }
      history.push({ role: "tool", content: result, tool_call_id: toolCall.id });
    }
  }

  return accumulated;
}
