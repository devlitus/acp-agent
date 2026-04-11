import { test, expect, describe } from "bun:test";
import { AgentRegistry } from "./registry.ts";
import type { AgentConfig } from "./types.ts";

const stubAgent: AgentConfig = {
  id: "stub",
  name: "Stub Agent",
  description: "Test stub",
  icon: "🧪",
  audience: "all",
  tools: ["read_file"],
  systemPromptFile: "coding.md", // reuse an existing prompt file
  suggestedPrompts: [],
};

describe("AgentRegistry", () => {
  test("get() returns a registered agent", () => {
    const reg = new AgentRegistry();
    reg.register(stubAgent);
    expect(reg.get("stub")).toBe(stubAgent);
  });

  test("get() throws for an unknown agent ID", () => {
    const reg = new AgentRegistry();
    expect(() => reg.get("nonexistent")).toThrow('Unknown agent ID: "nonexistent"');
  });

  test("getAll() returns all registered agents", () => {
    const reg = new AgentRegistry();
    reg.register(stubAgent);
    expect(reg.getAll()).toHaveLength(1);
    expect(reg.getAll()[0]).toBe(stubAgent);
  });

  test("register() is chainable", () => {
    const reg = new AgentRegistry();
    const second: AgentConfig = { ...stubAgent, id: "second" };
    reg.register(stubAgent).register(second);
    expect(reg.getAll()).toHaveLength(2);
  });

  test("getSystemPrompt() returns non-empty string for valid prompt file", () => {
    const reg = new AgentRegistry();
    reg.register(stubAgent);
    const prompt = reg.getSystemPrompt(stubAgent);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  test("validate() throws when an agent references a tool not in the global registry", () => {
    const reg = new AgentRegistry();
    reg.register({ ...stubAgent, tools: ["nonexistent_tool"] });
    expect(() => reg.validate()).toThrow('Agent "stub" references unknown tool: "nonexistent_tool"');
  });

  test("validate() passes when all referenced tools exist", () => {
    const reg = new AgentRegistry();
    reg.register(stubAgent); // uses "read_file" which is in the global registry
    expect(() => reg.validate()).not.toThrow();
  });
});
