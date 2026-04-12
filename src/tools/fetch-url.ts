import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";

const MAX_CHARS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ACP-Agent/1.0; +https://github.com/agentclientprotocol)";

export const fetchUrlTool: Tool = {
  kind: "read",
  definition: {
    name: "fetch_url",
    description:
      "Fetch a web page and extract its readable text content. Use after web_search to read the full content of a specific URL. Not suitable for PDFs, images, or binary files.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to fetch (must start with http:// or https://)",
        },
      },
      required: ["url"],
    },
  },
  async execute(toolCall: ToolCall, _ctx: ToolContext): Promise<string> {
    const url = toolCall.arguments.url as string;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "Error: URL must start with http:// or https://";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });
    } catch (err) {
      return `Error fetching URL: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (!response.ok) {
      return `HTTP error: ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return `Unsupported content type: ${contentType}. Only HTML and plain text are supported.`;
    }

    const html = await response.text();
    const text = extractText(html);

    if (!text) return "No readable content found on this page.";

    const truncated = text.length > MAX_CHARS;
    return truncated
      ? `${text.slice(0, MAX_CHARS)}\n\n[Content truncated at ${MAX_CHARS} characters]`
      : text;
  },
};

function extractText(html: string): string {
  const entities: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  let text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  for (const [e, v] of Object.entries(entities)) text = text.replaceAll(e, v);
  return text.replace(/\s{2,}/g, " ").trim();
}
