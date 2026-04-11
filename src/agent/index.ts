import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";
import { OllamaAgent } from "./agent.ts";
import { OllamaProvider } from "../llm/ollama.ts";
import { GroqProvider } from "../llm/groq.ts";
import { LLM_PROVIDER, AGENT_ID } from "../config.ts";
import { registry as agentRegistry } from "../agents/index.ts";
import { registry as toolRegistry } from "../tools/index.ts";
import type { LLMProvider } from "../llm/types.ts";

function createProvider(): LLMProvider {
  switch (LLM_PROVIDER) {
    case "groq":
      return new GroqProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${LLM_PROVIDER}". Use "ollama" or "groq".`);
  }
}

const input = Writable.toWeb(process.stdout);
const output = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;

const llm = createProvider();
const agentConfig = agentRegistry.get(AGENT_ID);
const systemPrompt = agentRegistry.getSystemPrompt(agentConfig);
const tools = toolRegistry.forAgent(agentConfig.tools);

const stream = acp.ndJsonStream(input, output);
new acp.AgentSideConnection(
  (conn) => new OllamaAgent(conn, llm, systemPrompt, tools),
  stream,
);
