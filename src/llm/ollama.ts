import { OLLAMA_URL, OLLAMA_MODEL } from "../config.ts";
import { streamOpenAICompat } from "./openai-stream.ts";
import type { LLMProvider, Message, ToolDefinition, ToolCall } from "./types.ts";

export class OllamaProvider implements LLMProvider {
  async call(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    onTextChunk: (text: string) => Promise<void>,
  ): Promise<{ toolCalls?: ToolCall[] }> {
    return streamOpenAICompat({
      url: `${OLLAMA_URL}/v1/chat/completions`,
      headers: {},
      model: OLLAMA_MODEL,
      messages,
      tools,
      signal,
      onTextChunk,
    });
  }
}
