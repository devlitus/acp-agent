import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { getTavilyApiKey } from "../config.ts";

const TAVILY_URL = "https://api.tavily.com/search";

type TavilyResult = { title: string; url: string; content: string };

export const webSearchTool: Tool = {
  kind: "read",
  definition: {
    name: "web_search",
    description:
      "Search the web for current information. Use when you need up-to-date facts, news, or topics not in your training data. Returns titles, URLs, and snippets.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        count: {
          type: "number",
          description: "Number of results to return (1-10, default 5)",
        },
      },
      required: ["query"],
    },
  },
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      return "Error: TAVILY_API_KEY is not configured. Set it in your environment or .env file.";
    }

    const query = toolCall.arguments.query as string;
    const count = Math.min(10, Math.max(1, (toolCall.arguments.count as number | undefined) ?? 5));

    const signals = [AbortSignal.timeout(15_000), ctx.signal].filter(
      (s): s is AbortSignal => s != null,
    );
    const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0];

    let response: Response;
    try {
      response = await fetch(TAVILY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: count,
          include_answer: false,
        }),
        signal,
      });
    } catch (err) {
      return `Error connecting to Tavily: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return `Tavily API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`;
    }

    const data = await response.json() as { results?: TavilyResult[] };
    const results = data.results ?? [];

    if (results.length === 0) {
      return "No results found.";
    }

    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`)
      .join("\n\n");
  },
};
