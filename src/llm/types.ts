export interface AssistantToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: AssistantToolCall[];  // solo en mensajes del assistant
  tool_call_id?: string;             // solo en mensajes de tool result
}

export interface ToolPropertySchema {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolPropertySchema>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMProvider {
  call(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    onTextChunk: (text: string) => Promise<void>,
  ): Promise<{ toolCalls?: ToolCall[] }>;
}
