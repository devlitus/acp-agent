import { describe, expect, it } from "bun:test";
import { AgentRegistry } from "../src/agents/registry.ts";
import type { AgentConfig } from "../src/agents/types.ts";

describe("AgentRegistry", () => {
  it("throws on unknown agent ID", () => {
    const registry = new AgentRegistry();
    const config: AgentConfig = {
      id: "test",
      name: "Test Agent",
      description: "Test description",
      icon: "🧪",
      audience: "all",
      tools: ["read_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    registry.register(config);

    expect(() => registry.get("unknown")).toThrow('Unknown agent ID: "unknown"');
  });

  it("throws on startup if a tool listed in config doesn't exist in ToolRegistry", () => {
    const registry = new AgentRegistry();
    const config: AgentConfig = {
      id: "test",
      name: "Test Agent",
      description: "Test description",
      icon: "🧪",
      audience: "all",
      tools: ["nonexistent_tool"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    registry.register(config);

    expect(() => registry.validate()).toThrow(
      'Agent "test" references unknown tool: "nonexistent_tool"'
    );
  });
});
