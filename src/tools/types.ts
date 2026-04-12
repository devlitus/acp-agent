import type * as acp from "@agentclientprotocol/sdk";
import type { ToolCall, ToolDefinition } from "../llm/types.ts";

export interface ToolContext {
  sessionId: string;
  connection: acp.AgentSideConnection;
  signal?: AbortSignal;
}

export interface Tool {
  definition: ToolDefinition;
  kind: acp.ToolKind;
  execute(toolCall: ToolCall, ctx: ToolContext): Promise<string>;
}
