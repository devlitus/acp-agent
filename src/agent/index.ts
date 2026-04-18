import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";
import { OllamaAgent } from "./agent.ts";
import { OllamaProvider } from "../llm/ollama.ts";
import { GroqProvider } from "../llm/groq.ts";
import { LMStudioProvider } from "../llm/lm-studio.ts";
import { getLLMProvider, getAgentId } from "../config.ts";
import { registry as agentRegistry } from "../agents/index.ts";
import { registry as toolRegistry } from "../tools/index.ts";
import type { LLMProvider } from "../llm/types.ts";
import type { AgentConfig } from "../agents/types.ts";

function createProvider(): LLMProvider {
  const provider = getLLMProvider();
  switch (provider) {
    case "groq":
      return new GroqProvider();
    case "ollama":
      return new OllamaProvider();
    case "lm-studio":
      return new LMStudioProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "ollama", "groq" or "lm-studio".`);
  }
}

// Validate agent configuration at startup
try {
  agentRegistry.validate();
} catch (err) {
  console.error(`\n❌  Agent configuration error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`    Check that all tool names in src/agents/*.ts exist in src/tools/index.ts\n`);
  process.exit(1);
}

const input = Writable.toWeb(process.stdout);
const output = Readable.toWeb(process.stdin) as unknown as ReadableStream<Uint8Array>;

const llm = createProvider();

let agentConfig: AgentConfig;
let systemPrompt: string;
let tools: ReturnType<typeof toolRegistry.forAgent>;

const agentId = getAgentId();
try {
  agentConfig = agentRegistry.get(agentId);
  systemPrompt = agentRegistry.getSystemPrompt(agentConfig);
  tools = toolRegistry.forAgent(agentConfig.tools);
} catch (err) {
  const validIds = agentRegistry.getAll()
    .map(a => JSON.stringify(a.id))
    .join(", ");
  console.error(`\n❌  Agent startup error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`    Set AGENT_ID to one of: ${validIds}`);
  console.error(`    Example: AGENT_ID=coding bun run src/agent/index.ts\n`);
  process.exit(1);
}

const stream = acp.ndJsonStream(input, output);
new acp.AgentSideConnection(
  (conn) => new OllamaAgent(conn, llm, systemPrompt, tools, agentId),
  stream,
);
