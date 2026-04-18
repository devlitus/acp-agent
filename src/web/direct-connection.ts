import type * as acp from "@agentclientprotocol/sdk";
import type { ExtendedAgentConnection } from "../agent/types.ts";
import type { BridgeData, PendingPermission, ServerMessage } from "./bridge.ts";

export class DirectConnection implements ExtendedAgentConnection {
  constructor(
    private ws: Bun.ServerWebSocket<BridgeData>,
    private pendingPermissions: Map<string, PendingPermission>,
  ) {}

  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    const update = params.update;

    switch (update.sessionUpdate) {
      case "user_message_chunk":
      case "agent_message_chunk":
        if (update.content?.type === "text") {
          this.send({ type: "chunk", text: update.content.text });
        }
        break;

      case "tool_call":
        this.send({
          type: "action",
          toolCallId: update.toolCallId,
          title: update.title ?? "Unknown",
          status: "running",
        });
        this.send({
          type: "action_detail",
          toolCallId: update.toolCallId,
          input: update.rawInput,
          output: "",
        });
        break;

      case "tool_call_update": {
        const wsStatus: "running" | "done" | "error" =
          update.status === "completed" ? "done" :
          update.status === "failed"    ? "error" :
          "running";
        this.send({
          type: "action",
          toolCallId: update.toolCallId,
          title: update.title ?? "Unknown",
          status: wsStatus,
        });
        this.send({
          type: "action_detail",
          toolCallId: update.toolCallId,
          input: update.rawInput,
          output: JSON.stringify(update.rawOutput),
        });
        break;
      }

      case "plan":
      case "agent_thought_chunk":
        break;
    }
  }

  async requestPermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    const toolCallId = params.toolCall.toolCallId;

    this.send({
      type: "permission",
      toolCallId,
      title: params.toolCall.title ?? "",
      options: params.options.map((opt) => ({
        id: opt.optionId,
        name: opt.name,
        kind: opt.kind ?? "other",
      })),
    });

    const selectedOptionId = await new Promise<string>((resolve, reject) => {
      this.pendingPermissions.set(toolCallId, { toolCallId, resolve, reject });
    });

    return {
      outcome: {
        outcome: "selected",
        optionId: selectedOptionId,
      },
    };
  }

  async readTextFile(_params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    return { content: "" };
  }

  async writeTextFile(_params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    return {};
  }

  async createTerminal(_params: acp.CreateTerminalRequest): Promise<acp.TerminalHandle> {
    throw new Error("createTerminal no disponible en el bridge web");
  }

  private send(msg: ServerMessage): void {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("DirectConnection: error enviando mensaje:", err);
    }
  }
}
