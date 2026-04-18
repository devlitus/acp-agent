import type * as acp from "@agentclientprotocol/sdk";
import type { ToolCall, ToolDefinition, LLMProvider } from "../llm/types.ts";
import type { ExtendedAgentConnection } from "../agent/types.ts";

export interface ToolContext {
  sessionId: string;
  connection: ExtendedAgentConnection;
  signal?: AbortSignal;
  llm?: LLMProvider;
  onSubAgentChange?: (agentId: string | null, agentName: string, agentIcon: string) => void;
}

export interface Tool {
  definition: ToolDefinition;
  kind: acp.ToolKind;
  execute(toolCall: ToolCall, ctx: ToolContext): Promise<string>;
}
