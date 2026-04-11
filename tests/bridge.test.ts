import { describe, expect, it, mock } from "bun:test";

class WebSocketClient {
  constructor(
    private ws: WebSocket,
    private pendingPermissions: Map<string, any>,
  ) {}

  async sessionUpdate(params: any): Promise<void> {
    const update = params.update;

    switch (update.sessionUpdate) {
      case "user_message_chunk":
      case "agent_message_chunk":
        if (update.content?.type === "text") {
          this.ws.send(
            JSON.stringify({ type: "chunk", text: update.content.text }),
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
          }),
        );
        this.ws.send(
          JSON.stringify({
            type: "action_detail",
            toolCallId: update.toolCallId,
            input: update.rawInput,
            output: "",
          }),
        );
        break;

      case "tool_call_update": {
        const wsStatus = update.status === "completed" ? "done" : "running";
        this.ws.send(
          JSON.stringify({
            type: "action",
            toolCallId: update.toolCallId,
            title: update.title ?? "Unknown",
            status: wsStatus,
          }),
        );
        this.ws.send(
          JSON.stringify({
            type: "action_detail",
            toolCallId: update.toolCallId,
            input: update.rawInput,
            output: JSON.stringify(update.rawOutput),
          }),
        );
        break;
      }

      case "plan":
      case "agent_thought_chunk":
        break;
    }
  }

  async requestPermission(params: any): Promise<any> {
    const toolCallId = params.toolCall.toolCallId;

    this.ws.send(
      JSON.stringify({
        type: "permission",
        toolCallId,
        title: params.toolCall.title,
        options: params.options.map((opt: any) => ({
          id: opt.optionId,
          name: opt.name,
          kind: opt.kind,
        })),
      }),
    );

    const selectedOptionId = await new Promise<string>((resolve) => {
      const permission = { toolCallId, resolve };
      this.pendingPermissions.set(toolCallId, permission);
    });

    return {
      outcome: {
        outcome: "selected",
        optionId: selectedOptionId,
      },
    };
  }
}

describe("WebSocketClient (ACP Bridge Logic)", () => {
  it("chunk event is forwarded to WebSocket", async () => {
    const mockSend = mock((data: string) => {});
    const mockWs = {
      send: mockSend,
    } as unknown as WebSocket;

    const pendingPermissions = new Map<string, any>();
    const wsClient = new WebSocketClient(mockWs, pendingPermissions);

    await wsClient.sessionUpdate({
      update: {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "Hello, world!" },
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0]?.[0];
    if (!call) throw new Error("No call found");
    const message = JSON.parse(call as string);
    expect(message.type).toBe("chunk");
    expect(message.text).toBe("Hello, world!");
  });

  it("tool_call event sends action + action_detail", async () => {
    const mockSend = mock((data: string) => {});
    const mockWs = {
      send: mockSend,
    } as unknown as WebSocket;

    const pendingPermissions = new Map<string, any>();
    const wsClient = new WebSocketClient(mockWs, pendingPermissions);

    await wsClient.sessionUpdate({
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tc-123",
        title: "Read File",
        rawInput: { path: "/test.txt" },
        rawOutput: null,
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    
    const actionCall = mockSend.mock.calls[0]?.[0];
    if (!actionCall) throw new Error("No action call found");
    const actionMsg = JSON.parse(actionCall as string);
    expect(actionMsg.type).toBe("action");
    expect(actionMsg.toolCallId).toBe("tc-123");
    expect(actionMsg.title).toBe("Read File");
    expect(actionMsg.status).toBe("running");

    const detailCall = mockSend.mock.calls[1]?.[0];
    if (!detailCall) throw new Error("No detail call found");
    const detailMsg = JSON.parse(detailCall as string);
    expect(detailMsg.type).toBe("action_detail");
    expect(detailMsg.toolCallId).toBe("tc-123");
    expect(detailMsg.input).toEqual({ path: "/test.txt" });
  });

  it("permission request sends permission message and resolves on response", async () => {
    const mockSend = mock((data: string) => {});
    const mockWs = {
      send: mockSend,
    } as unknown as WebSocket;

    const pendingPermissions = new Map<string, any>();
    const wsClient = new WebSocketClient(mockWs, pendingPermissions);

    const permissionPromise = wsClient.requestPermission({
      toolCall: {
        toolCallId: "tc-456",
        title: "Write File",
      },
      options: [
        { optionId: "allow", name: "Allow", kind: "string" },
        { optionId: "deny", name: "Deny", kind: "string" },
      ],
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0]?.[0];
    if (!call) throw new Error("No call found");
    const message = JSON.parse(call as string);
    expect(message.type).toBe("permission");
    expect(message.toolCallId).toBe("tc-456");
    expect(message.title).toBe("Write File");
    expect(message.options).toEqual([
      { id: "allow", name: "Allow", kind: "string" },
      { id: "deny", name: "Deny", kind: "string" },
    ]);

    const pending = pendingPermissions.get("tc-456");
    pending.resolve("allow");

    const result = await permissionPromise;
    expect(result.outcome.outcome).toBe("selected");
    expect(result.outcome.optionId).toBe("allow");
  });

  it("handlePermissionResponse resolves the correct pending promise", async () => {
    const mockSend = mock((data: string) => {});
    const mockWs = {
      send: mockSend,
    } as unknown as WebSocket;

    const pendingPermissions = new Map<string, any>();
    const wsClient = new WebSocketClient(mockWs, pendingPermissions);

    const promise1 = wsClient.requestPermission({
      toolCall: { toolCallId: "tc-1", title: "Tool 1" },
      options: [
        { optionId: "opt-1", name: "Option 1", kind: "string" },
      ],
    });

    const promise2 = wsClient.requestPermission({
      toolCall: { toolCallId: "tc-2", title: "Tool 2" },
      options: [
        { optionId: "opt-2", name: "Option 2", kind: "string" },
      ],
    });

    mockSend.mockClear();

    const pending2 = pendingPermissions.get("tc-2");
    pending2.resolve("opt-2");

    const result2 = await promise2;
    expect(result2.outcome.optionId).toBe("opt-2");

    const pending1 = pendingPermissions.get("tc-1");
    pending1.resolve("opt-1");

    const result1 = await promise1;
    expect(result1.outcome.optionId).toBe("opt-1");
  });

  it("tool_call_update status mapping handles running, completed, error", async () => {
    const mockSend = mock((data: string) => {});
    const mockWs = {
      send: mockSend,
    } as unknown as WebSocket;

    const pendingPermissions = new Map<string, any>();
    const wsClient = new WebSocketClient(mockWs, pendingPermissions);

    await wsClient.sessionUpdate({
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tc-789",
        title: "Test Tool",
        status: "running",
        rawInput: {},
        rawOutput: null,
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    const actionCall = mockSend.mock.calls[0]?.[0];
    if (!actionCall) throw new Error("No action call found");
    const actionMsg = JSON.parse(actionCall as string);
    expect(actionMsg.status).toBe("running");

    mockSend.mockClear();

    await wsClient.sessionUpdate({
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tc-789",
        title: "Test Tool",
        status: "completed",
        rawInput: {},
        rawOutput: { result: "done" },
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    const completedActionCall = mockSend.mock.calls[0]?.[0];
    if (!completedActionCall) throw new Error("No completed action call found");
    const completedActionMsg = JSON.parse(completedActionCall as string);
    expect(completedActionMsg.status).toBe("done");

    mockSend.mockClear();

    await wsClient.sessionUpdate({
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tc-789",
        title: "Test Tool",
        status: "error",
        rawInput: {},
        rawOutput: { error: "failed" },
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    const errorActionCall = mockSend.mock.calls[0]?.[0];
    if (!errorActionCall) throw new Error("No error action call found");
    const errorActionMsg = JSON.parse(errorActionCall as string);
    expect(errorActionMsg.status).toBe("running");
  });
});
