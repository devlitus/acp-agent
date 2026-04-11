import { GROQ_API_KEY, GROQ_MODEL } from "../config.ts";
import { streamOpenAICompat } from "./openai-stream.ts";
import type { LLMProvider, Message, ToolDefinition, ToolCall } from "./types.ts";

export class GroqProvider implements LLMProvider {
  async call(
    messages: Message[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    onTextChunk: (text: string) => Promise<void>,
  ): Promise<{ toolCalls?: ToolCall[] }> {
    return streamOpenAICompat({
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      model: GROQ_MODEL,
      messages,
      tools,
      signal,
      onTextChunk,
    });
  }
}
