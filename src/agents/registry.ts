import type { AgentConfig } from "./types.ts";
import { registry as toolRegistry } from "../tools/index.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export class AgentRegistry {
  private agents = new Map<string, AgentConfig>();

  register(config: AgentConfig): this {
    this.agents.set(config.id, config);
    return this;
  }

  get(id: string): AgentConfig {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Unknown agent ID: "${id}"`);
    }
    return agent;
  }

  getAll(): AgentConfig[] {
    return [...this.agents.values()];
  }

  getSystemPrompt(config: AgentConfig): string {
    const path = resolve(import.meta.dir, "prompts", config.systemPromptFile);
    return readFileSync(path, "utf-8");
  }

  validate(): void {
    for (const agent of this.agents.values()) {
      for (const toolName of agent.tools) {
        if (!toolRegistry.definitions.some((d) => d.name === toolName)) {
          throw new Error(
            `Agent "${agent.id}" references unknown tool: "${toolName}"`
          );
        }
      }
    }
  }
}
