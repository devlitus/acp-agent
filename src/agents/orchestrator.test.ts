import { test, expect, describe } from "bun:test";
import { orchestratorAgent } from "./orchestrator.ts";
import { registry } from "./index.ts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("orchestratorAgent config", () => {
  test("tiene id, name, icon y audience correctos", () => {
    expect(orchestratorAgent.id).toBe("orchestrator");
    expect(typeof orchestratorAgent.name).toBe("string");
    expect(orchestratorAgent.name.length).toBeGreaterThan(0);
    expect(typeof orchestratorAgent.icon).toBe("string");
    expect(orchestratorAgent.audience).toBe("all");
  });

  test("tiene invoke_agent como única tool", () => {
    expect(orchestratorAgent.tools).toContain("invoke_agent");
  });

  test("el archivo de system prompt existe y tiene contenido", () => {
    const path = resolve(import.meta.dir, "prompts", orchestratorAgent.systemPromptFile);
    expect(existsSync(path)).toBe(true);

    const prompt = registry.getSystemPrompt(orchestratorAgent);
    expect(prompt.length).toBeGreaterThan(100);
  });

  test("tiene suggestedPrompts con al menos un elemento", () => {
    expect(Array.isArray(orchestratorAgent.suggestedPrompts)).toBe(true);
    expect(orchestratorAgent.suggestedPrompts.length).toBeGreaterThan(0);
  });

  test("registry.get('orchestrator') devuelve el agente registrado", () => {
    const config = registry.get("orchestrator");
    expect(config.id).toBe("orchestrator");
  });

  test("registry.validate() pasa sin errores", () => {
    expect(() => registry.validate()).not.toThrow();
  });
});
