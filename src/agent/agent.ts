import * as acp from "@agentclientprotocol/sdk";
import type { LLMProvider, Message } from "../llm/types.ts";
import { sessionStore } from "./session-store.ts";
import type { ExtendedAgentConnection } from "./types.ts";

interface AgentSession {
  history: Message[];
  pendingPrompt: AbortController | null;
}

export class OllamaAgent implements acp.Agent {
  private sessions = new Map<string, AgentSession>();
  onSubAgentChange?: (agentId: string | null, agentName: string, agentIcon: string) => void;

  constructor(
    private connection: ExtendedAgentConnection,
    private llm: LLMProvider,
    private systemPrompt: string,
    private toolRegistry: import("../tools/registry.ts").ToolRegistry,
    private agentId: string,
  ) {}

  async initialize(_params: acp.InitializeRequest): Promise<acp.InitializeResponse> {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: true },
    };
  }

  async newSession(_params: acp.NewSessionRequest): Promise<acp.NewSessionResponse> {
    const sessionId = crypto.randomUUID();
    sessionStore.create(sessionId, this.agentId);
    this.sessions.set(sessionId, {
      history: [{ role: "system", content: this.systemPrompt }],
      pendingPrompt: null,
    });
    return { sessionId };
  }

  async authenticate(_params: acp.AuthenticateRequest): Promise<acp.AuthenticateResponse | void> {
    return {};
  }

  async setSessionMode(_params: acp.SetSessionModeRequest): Promise<acp.SetSessionModeResponse> {
    return {};
  }

  async prompt(params: acp.PromptRequest): Promise<acp.PromptResponse> {
    const session = this.sessions.get(params.sessionId);
    if (!session) throw new Error(`Session ${params.sessionId} not found`);

    session.pendingPrompt?.abort();
    const abort = new AbortController();
    session.pendingPrompt = abort;

    const userText = params.prompt
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("\n");

    session.history.push({ role: "user", content: userText });

    try {
      await this.runAgentLoop(params.sessionId, session, abort.signal);
    } catch (err) {
      if (abort.signal.aborted) return { stopReason: "cancelled" };
      throw err;
    }

    session.pendingPrompt = null;
    sessionStore.save(params.sessionId, session.history);
    return { stopReason: "end_turn" };
  }

  private async runAgentLoop(
    sessionId: string,
    session: AgentSession,
    signal: AbortSignal,
  ): Promise<void> {
    while (true) {
      let assistantText = "";

      const { toolCalls } = await this.llm.call(
        session.history,
        this.toolRegistry.definitions,
        signal,
        async (chunk) => {
          assistantText += chunk;
          await this.connection.sessionUpdate({
            sessionId,
            update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: chunk } },
          });
        },
      );

      if (!toolCalls || toolCalls.length === 0) {
        session.history.push({ role: "assistant", content: assistantText });
        break;
      }

      session.history.push({
        role: "assistant",
        content: null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });

      for (const toolCall of toolCalls) {
        const path = toolCall.arguments.path as string | undefined;

        await this.connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: "tool_call",
            toolCallId: toolCall.id,
            title: toolCall.name,
            kind: this.toolRegistry.kind(toolCall.name),
            status: "pending",
            locations: path ? [{ path }] : [],
            rawInput: toolCall.arguments,
          },
        });

        let result: string;
        try {
          result = await this.toolRegistry.execute(toolCall, { sessionId, connection: this.connection, signal, llm: this.llm, onSubAgentChange: this.onSubAgentChange });
        } catch (err) {
          result = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
        }

        await this.connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: "tool_call_update",
            toolCallId: toolCall.id,
            title: toolCall.name,
            status: "completed",
            rawOutput: { result },
          },
        });

        session.history.push({ role: "tool", content: result, tool_call_id: toolCall.id });
      }
    }
  }

  async loadSession(params: acp.LoadSessionRequest): Promise<acp.LoadSessionResponse> {
    const history = sessionStore.load(params.sessionId);
    if (!history) throw new Error(`Session ${params.sessionId} not found`);

    this.sessions.set(params.sessionId, { history, pendingPrompt: null });

    for (const msg of history) {
      if (msg.role === "user" && typeof msg.content === "string") {
        await this.connection.sessionUpdate({
          sessionId: params.sessionId,
          update: { sessionUpdate: "user_message_chunk", content: { type: "text", text: msg.content } },
        });
      } else if (msg.role === "assistant" && typeof msg.content === "string" && msg.content) {
        await this.connection.sessionUpdate({
          sessionId: params.sessionId,
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: msg.content } },
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          await this.connection.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: "tool_call",
              toolCallId: tc.id,
              title: tc.function.name,
              kind: "other",
              status: "completed",
              locations: [],
              rawInput: JSON.parse(tc.function.arguments),
            },
          });
        }
      }
    }

    return {};
  }

  async cancel(params: acp.CancelNotification): Promise<void> {
    this.sessions.get(params.sessionId)?.pendingPrompt?.abort();
  }
}
