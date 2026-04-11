import { describe, expect, it } from "bun:test";
import { AgentRegistry } from "../src/agents/registry.ts";
import type { AgentConfig } from "../src/agents/types.ts";

describe("AgentRegistry", () => {
  it("returns agent by ID", () => {
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

    const agent = registry.get("test");
    expect(agent.id).toBe("test");
    expect(agent.name).toBe("Test Agent");
  });

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

  it("returns all registered agents", () => {
    const registry = new AgentRegistry();
    const config1: AgentConfig = {
      id: "test1",
      name: "Test Agent 1",
      description: "Test description 1",
      icon: "🧪",
      audience: "all",
      tools: ["read_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    const config2: AgentConfig = {
      id: "test2",
      name: "Test Agent 2",
      description: "Test description 2",
      icon: "🔬",
      audience: "technical",
      tools: ["write_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    registry.register(config1).register(config2);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((a) => a.id)).toEqual(["test1", "test2"]);
  });

  it("supports method chaining", () => {
    const registry = new AgentRegistry();
    const config1: AgentConfig = {
      id: "test1",
      name: "Test Agent 1",
      description: "Test description 1",
      icon: "🧪",
      audience: "all",
      tools: ["read_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    const config2: AgentConfig = {
      id: "test2",
      name: "Test Agent 2",
      description: "Test description 2",
      icon: "🔬",
      audience: "technical",
      tools: ["write_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };

    const result = registry.register(config1).register(config2);
    expect(result).toBe(registry);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("validates successfully when all tools exist", () => {
    const registry = new AgentRegistry();
    const config: AgentConfig = {
      id: "test",
      name: "Test Agent",
      description: "Test description",
      icon: "🧪",
      audience: "all",
      tools: ["read_file", "write_file"],
      systemPromptFile: "test.md",
      suggestedPrompts: [],
    };
    registry.register(config);

    expect(() => registry.validate()).not.toThrow();
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
