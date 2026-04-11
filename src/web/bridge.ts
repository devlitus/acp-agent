import * as acp from "@agentclientprotocol/sdk";
import { ChildProcess, spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";

export type BridgeData = {
  agentId: string;
  sessionId?: string;
  bridge: ACPWebSocketBridge | null;
};

type ClientMessage =
  | { type: "prompt"; text: string }
  | { type: "cancel" }
  | { type: "permission"; toolCallId: string; optionId: string };

type ServerMessage =
  | { type: "chunk"; text: string }
  | { type: "action"; toolCallId: string; title: string; status: "running" | "done" | "error" }
  | { type: "action_detail"; toolCallId: string; input: unknown; output: string }
  | { type: "permission"; toolCallId: string; title: string; options: { id: string; name: string; kind: string }[] }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string };

type PendingPermission = {
  toolCallId: string;
  resolve: (optionId: string) => void;
};

class WebSocketClient implements acp.Client {
  constructor(
    private ws: Bun.ServerWebSocket<BridgeData>,
    private pendingPermissions: Map<string, PendingPermission>,
  ) {}

  async requestPermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const toolCallId = params.toolCall.toolCallId;

    this.ws.send(
      JSON.stringify({
        type: "permission",
        toolCallId,
        title: params.toolCall.title,
        options: params.options.map((opt) => ({
          id: opt.optionId,
          name: opt.name,
          kind: opt.kind,
        })),
      } as ServerMessage),
    );

    const selectedOptionId = await new Promise<string>((resolve) => {
      const permission: PendingPermission = { toolCallId, resolve };
      this.pendingPermissions.set(toolCallId, permission);
    });

    return {
      outcome: {
        outcome: "selected",
        optionId: selectedOptionId,
      },
    };
  }

  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    const update = params.update;

    switch (update.sessionUpdate) {
      case "user_message_chunk":
      case "agent_message_chunk":
        if (update.content?.type === "text") {
          this.ws.send(
            JSON.stringify({ type: "chunk", text: update.content.text } as ServerMessage),
          );
        }
        break;

      case "tool_call":
        this.ws.send(
          JSON.stringify({
            type: "action",
            toolCallId: update.toolCallId,
            title: update.title ?? "Unknown",
            status: "running",
          } as ServerMessage),
        );
        this.ws.send(
          JSON.stringify({
            type: "action_detail",
            toolCallId: update.toolCallId,
            input: update.rawInput,
            output: "",
          } as ServerMessage),
        );
        break;

      case "tool_call_update": {
        const wsStatus: "running" | "done" | "error" =
          update.status === "completed" ? "done" :
          update.status === "failed"    ? "error" :
          "running";
        this.ws.send(
          JSON.stringify({
            type: "action",
            toolCallId: update.toolCallId,
            title: update.title ?? "Unknown",
            status: wsStatus,
          } as ServerMessage),
        );
        this.ws.send(
          JSON.stringify({
            type: "action_detail",
            toolCallId: update.toolCallId,
            input: update.rawInput,
            output: JSON.stringify(update.rawOutput),
          } as ServerMessage),
        );
        break;
      }

      case "plan":
      case "agent_thought_chunk":
        break;
    }
  }

  async writeTextFile(
    _params: acp.WriteTextFileRequest,
  ): Promise<acp.WriteTextFileResponse> {
    return {};
  }

  async readTextFile(
    _params: acp.ReadTextFileRequest,
  ): Promise<acp.ReadTextFileResponse> {
    return { content: "" };
  }
}

export class ACPWebSocketBridge {
  private agentProcess: ChildProcess | null = null;
  private connection: acp.ClientSideConnection | null = null;
  private sessionId: string | null = null;
  private pendingPermissions = new Map<string, PendingPermission>();
  private wsClient: WebSocketClient | null = null;

  constructor(private ws: Bun.ServerWebSocket<BridgeData>) {}

  async start(agentId: string, existingSessionId?: string): Promise<void> {
    const env = { ...process.env, AGENT_ID: agentId };

    this.agentProcess = spawn("bun", ["run", "src/agent/index.ts"], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!this.agentProcess.stdin || !this.agentProcess.stdout) {
      throw new Error("Failed to spawn agent process");
    }

    const input = Writable.toWeb(this.agentProcess.stdin);
    const output = Readable.toWeb(this.agentProcess.stdout) as ReadableStream<Uint8Array>;

    this.wsClient = new WebSocketClient(this.ws, this.pendingPermissions);

    this.connection = new acp.ClientSideConnection(
      () => this.wsClient!,
      acp.ndJsonStream(input, output),
    );

    this.agentProcess.stderr?.on("data", (data) => {
      console.error(`[Agent ${agentId}]`, data.toString());
    });

    this.agentProcess.on("exit", (code) => {
      console.log(`Agent ${agentId} exited with code ${code}`);
      this.sendError(`Agent process exited with code ${code}`);
    });

    try {
      const init = await this.connection.initialize({
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {
          fs: {
            readTextFile: true,
            writeTextFile: true,
          },
        },
      });

      console.log(`✅ Connected to agent (protocol v${init.protocolVersion})`);

      if (existingSessionId) {
        await this.connection.loadSession({
          sessionId: existingSessionId,
          cwd: process.cwd(),
          mcpServers: [],
        });
        this.sessionId = existingSessionId;
      } else {
        const newSession = await this.connection.newSession({
          cwd: process.cwd(),
          mcpServers: [],
        });
        this.sessionId = newSession.sessionId;
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
    this.agentProcess?.kill();
    this.agentProcess = null;
    this.connection = null;
    this.sessionId = null;
    this.pendingPermissions.clear();
    this.wsClient = null;
  }

  private async handlePrompt(text: string): Promise<void> {
    if (!this.connection || !this.sessionId) {
      this.sendError("No active session");
      return;
    }

    try {
      const result = await this.connection.prompt({
        sessionId: this.sessionId,
        prompt: [{ type: "text", text }],
      });

      this.send({ type: "done", stopReason: result.stopReason });
    } catch (err) {
      this.sendError(err instanceof Error ? err.message : String(err));
    }
  }

  private async handleCancel(): Promise<void> {
    if (!this.connection || !this.sessionId) return;

    try {
      await this.connection.cancel({ sessionId: this.sessionId });
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
