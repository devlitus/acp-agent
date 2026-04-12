import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { readBodyCapped } from "./utils.ts";

const DDG_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

type SearchResult = { title: string; url: string; description: string };

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
    const query = toolCall.arguments.query as string;
    const count = Math.min(10, Math.max(1, (toolCall.arguments.count as number | undefined) ?? 5));

    const signals = [AbortSignal.timeout(10_000), ctx.signal].filter(
      (s): s is AbortSignal => s != null,
    );
    const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0];

    let response: Response;
    try {
      response = await fetch(`${DDG_URL}?q=${encodeURIComponent(query)}&kl=us-en`, {
        headers: { "User-Agent": USER_AGENT },
        signal,
      });
    } catch (err) {
      return `Error connecting to search: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (!response.ok) {
      return `Search error: ${response.status} ${response.statusText}`;
    }

    const html = await readBodyCapped(response, 100_000, signal);
    const results = parseDDGResults(html, count);

    if (results.length === 0) {
      return "No results found.";
    }

    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`)
      .join("\n\n");
  },
};

function parseDDGResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];

  const titlePattern = /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetPattern = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const snippets: string[] = [];
  let snipMatch: RegExpExecArray | null;
  while ((snipMatch = snippetPattern.exec(html)) !== null) {
    snippets.push(cleanText(snipMatch[1] ?? ""));
  }

  let titleMatch: RegExpExecArray | null;
  let idx = 0;
  while ((titleMatch = titlePattern.exec(html)) !== null && results.length < limit) {
    const url = decodeUddg(titleMatch[1] ?? "");
    const title = cleanText(titleMatch[2] ?? "");
    if (title && url) {
      results.push({ title, url, description: snippets[idx] ?? "" });
      idx++;
    }
  }

  return results;
}

function decodeUddg(href: string): string {
  const match = href.match(/uddg=([^&]+)/);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return href.startsWith("http") ? href : "";
}

function cleanText(raw: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
  };
  let text = raw.replace(/<[^>]+>/g, "");
  for (const [e, v] of Object.entries(entities)) text = text.replaceAll(e, v);
  return text.replace(/\s{2,}/g, " ").trim();
}
