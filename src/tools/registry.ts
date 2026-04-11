import type * as acp from "@agentclientprotocol/sdk";
import type { ToolDefinition, ToolCall } from "../llm/types.ts";
import type { Tool, ToolContext } from "./types.ts";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): this {
    this.tools.set(tool.definition.name, tool);
    return this;
  }

  get definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  kind(name: string): acp.ToolKind {
    return this.tools.get(name)?.kind ?? "other";
  }

  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) return `Unknown tool: ${toolCall.name}`;
    return tool.execute(toolCall, ctx);
  }

  forAgent(allowedTools: string[]): ToolRegistry {
    const filtered = new ToolRegistry();
    for (const name of allowedTools) {
      const tool = this.tools.get(name);
      if (tool) {
        filtered.register(tool);
      }
    }
    return filtered;
  }
}
