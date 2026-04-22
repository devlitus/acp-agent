import * as acp from "@agentclientprotocol/sdk";
import { sessionStore } from "../agent/session-store.ts";
import { OllamaAgent } from "../agent/agent.ts";
import { OllamaProvider } from "../llm/ollama.ts";
import { GroqProvider } from "../llm/groq.ts";
import { LMStudioProvider } from "../llm/lm-studio.ts";
import { getLLMProvider } from "../config.ts";
import { registry as agentRegistry } from "../agents/index.ts";
import { registry as toolRegistry } from "../tools/index.ts";
import type { LLMProvider } from "../llm/types.ts";
import { DirectConnection } from "./direct-connection.ts";

export type BridgeData = {
  agentId: string;
  sessionId?: string;
  bridge: ACPWebSocketBridge | null;
};

type ClientMessage =
  | { type: "prompt"; text: string }
  | { type: "cancel" }
  | { type: "permission"; toolCallId: string; optionId: string };

export type ServerMessage =
  | { type: "chunk"; text: string }
  | { type: "action"; toolCallId: string; title: string; status: "running" | "done" | "error" }
  | { type: "action_detail"; toolCallId: string; input: unknown; output: string }
  | { type: "permission"; toolCallId: string; title: string; options: { id: string; name: string; kind: string }[] }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string }
  | { type: "sub_agent_start"; agentId: string; agentName: string; agentIcon: string }
  | { type: "sub_agent_end" }
  | { type: "session_created"; sessionId: string };

export type PendingPermission = {
  toolCallId: string;
  resolve: (optionId: string) => void;
  reject: (reason?: unknown) => void;
};

function createProvider(): LLMProvider {
  const provider = getLLMProvider();
  switch (provider) {
    case "groq":
      return new GroqProvider();
    case "lm-studio":
      return new LMStudioProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "ollama", "lm-studio" or "groq".`);
  }
}

export class ACPWebSocketBridge {
  private agent: OllamaAgent | null = null;
  private sessionId: string | null = null;
  private pendingPermissions = new Map<string, PendingPermission>();
  private setTitleOnFirstMessage = false;
  private activePromptAbort: AbortController | null = null;

  constructor(private ws: Bun.ServerWebSocket<BridgeData>) {}

  async start(_agentId: string, existingSessionId?: string): Promise<void> {
    try {
      const config = agentRegistry.get("orchestrator");
      const systemPromptBuilder = () => agentRegistry.getSystemPrompt(config);
      const llm = createProvider();
      const tools = toolRegistry.forAgent(config.tools);
      const connection = new DirectConnection(this.ws, this.pendingPermissions);

      this.agent = new OllamaAgent(connection, llm, systemPromptBuilder, tools, "orchestrator");
      this.agent.onSubAgentChange = (agentId, agentName, agentIcon) => {
        if (agentId) {
          this.send({ type: "sub_agent_start", agentId, agentName, agentIcon });
        } else {
          this.send({ type: "sub_agent_end" });
        }
      };

      await this.agent.initialize({ protocolVersion: acp.PROTOCOL_VERSION });

      if (existingSessionId) {
        await this.agent.loadSession({
          sessionId: existingSessionId,
          cwd: process.cwd(),
          mcpServers: [],
        });
        this.sessionId = existingSessionId;
      } else {
        const { sessionId } = await this.agent.newSession({
          cwd: process.cwd(),
          mcpServers: [],
        });
        this.sessionId = sessionId;
        this.setTitleOnFirstMessage = true;
        this.send({ type: "session_created", sessionId });
      }
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : String(err));
    }
  }

  handleClientMessage(data: string | Buffer): void {
    try {
      const msg = JSON.parse(data.toString()) as ClientMessage;

      switch (msg.type) {
        case "prompt":
          this.handlePrompt(msg.text);
          break;
        case "cancel":
          this.handleCancel();
          break;
        case "permission":
          this.handlePermissionResponse(msg.toolCallId, msg.optionId);
          break;
      }
    } catch (err) {
      this.sendError(`Invalid client message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  cleanup(): void {
    this.activePromptAbort?.abort();
    this.activePromptAbort = null;
    this.setTitleOnFirstMessage = false;
    this.agent = null;
    this.sessionId = null;
    for (const pending of this.pendingPermissions.values()) {
      pending.reject(new Error("WebSocket cerrado"));
    }
    this.pendingPermissions.clear();
  }

  private async handlePrompt(text: string): Promise<void> {
    if (!this.agent || !this.sessionId) {
      this.sendError("No active session");
      return;
    }

    if (this.activePromptAbort) {
      this.sendError("Ya hay un prompt en ejecución. Espera o cancela primero.");
      return;
    }

    const abort = new AbortController();
    this.activePromptAbort = abort;

    if (this.setTitleOnFirstMessage) {
      this.setTitleOnFirstMessage = false;
      const title = text.trim().slice(0, 60);
      sessionStore.setTitle(this.sessionId, title);
    }

    try {
      const result = await this.agent.prompt({
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
      });

      if (!abort.signal.aborted) {
        this.send({ type: "done", stopReason: result.stopReason });
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        this.sendError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (this.activePromptAbort === abort) {
        this.activePromptAbort = null;
      }
    }
  }

  private async handleCancel(): Promise<void> {
    if (!this.agent || !this.sessionId) return;

    this.activePromptAbort?.abort();
    this.activePromptAbort = null;

    try {
      await this.agent.cancel({ sessionId: this.sessionId });
      this.send({ type: "done", stopReason: "cancelled" });
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : String(err));
    }
  }

  private handlePermissionResponse(toolCallId: string, optionId: string): void {
    const pending = this.pendingPermissions.get(toolCallId);
    if (pending) {
      pending.resolve(optionId);
      this.pendingPermissions.delete(toolCallId);
    }
  }

  private send(msg: ServerMessage): void {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("Failed to send message to client:", err);
    }
  }

  private sendError(message: string): void {
    this.send({ type: "error", message });
  }
}
