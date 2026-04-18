import { AgentRegistry } from "./registry.ts";
import { codingAgent } from "./coding.ts";
import { writingAgent } from "./writing.ts";
import { devopsAgent } from "./devops.ts";
import { dataAgent } from "./data.ts";
import { researchAgent } from "./research.ts";
import { personalAgent } from "./personal.ts";
import { orchestratorAgent } from "./orchestrator.ts";

export const registry = new AgentRegistry()
  .register(codingAgent)
  .register(writingAgent)
  .register(devopsAgent)
  .register(dataAgent)
  .register(researchAgent)
  .register(personalAgent)
  .register(orchestratorAgent);
