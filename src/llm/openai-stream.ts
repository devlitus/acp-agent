import type { Message, ToolDefinition, ToolCall } from "./types.ts";

interface StreamOptions {
  url: string;
  headers: Record<string, string>;
  model: string;
  messages: Message[];
  tools: ToolDefinition[];
  signal: AbortSignal;
  onTextChunk: (text: string) => Promise<void>;
}

export async function streamOpenAICompat(opts: StreamOptions): Promise<{ toolCalls?: ToolCall[] }> {
  const { url, headers, model, messages, tools, signal, onTextChunk } = opts;

  const body: Record<string, unknown> = { model, messages, stream: true };
  if (tools.length > 0) {
    body.tools = tools.map((t) => ({ type: "function", function: t }));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`LLM error ${response.status}: ${await response.text()}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        if (toolCallsMap.size === 0) return {};
        return {
          toolCalls: [...toolCallsMap.values()].map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: JSON.parse(tc.arguments) as Record<string, unknown>,
          })),
        };
      }

      const chunk = JSON.parse(data) as {
        choices: {
          delta: {
            content?: string | null;
            tool_calls?: {
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
          finish_reason: string | null;
        }[];
      };

      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) await onTextChunk(delta.content);

      for (const tc of delta.tool_calls ?? []) {
        if (!toolCallsMap.has(tc.index)) {
          toolCallsMap.set(tc.index, { id: "", name: "", arguments: "" });
        }
        const entry = toolCallsMap.get(tc.index)!;
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name) entry.name = tc.function.name;
        if (tc.function?.arguments) entry.arguments += tc.function.arguments;
      }
    }
  }

  return {};
}
