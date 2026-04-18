/**
 * Proveedor LM Studio — compatible con la API de OpenAI.
 * Reutiliza openai-stream.ts (Strategy pattern).
 */

import { getLMStudioUrl, getLMStudioModel } from "../config.ts";
import { streamOpenAICompat } from "./openai-stream.ts";
import type { LLMProvider, Message, ToolDefinition, ToolCall } from "./types.ts";

export class LMStudioProvider implements LLMProvider {
  async call(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    onTextChunk: (text: string) => Promise<void>,
  ): Promise<{ toolCalls?: ToolCall[] }> {
    return streamOpenAICompat({
      url: `${getLMStudioUrl()}/v1/chat/completions`,
      headers: {},
      model: getLMStudioModel(),
      messages,
      tools,
      signal,
      onTextChunk,
    });
  }
}
