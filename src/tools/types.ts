import type * as acp from "@agentclientprotocol/sdk";
import type { ToolCall, ToolDefinition } from "../llm/types.ts";

export interface ToolContext {
  sessionId: string;
  connection: acp.AgentSideConnection;
}

export interface Tool {
  definition: ToolDefinition;
  kind: acp.ToolKind;
  execute(toolCall: ToolCall, ctx: ToolContext): Promise<string>;
}
