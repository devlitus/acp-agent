import { test, expect, describe } from "bun:test";
import { invokeAgentTool } from "./invoke-agent.ts";
import type { ToolContext } from "./types.ts";
import type { LLMProvider, Message, ToolDefinition, ToolCall } from "../llm/types.ts";
import type { ExtendedAgentConnection } from "../agent/types.ts";

function makeMockLLM(response: string): LLMProvider {
  return {
    async call(_messages, _tools, _signal, onTextChunk) {
      await onTextChunk(response);
      return { toolCalls: [] };
    },
  };
}

const stubConnection: ExtendedAgentConnection = {
  sessionUpdate: async () => {},
  requestPermission: async () => ({ outcome: { outcome: "cancelled" } }),
  readTextFile: async () => ({ content: "" }),
  writeTextFile: async () => ({}),
  createTerminal: async () => { throw new Error("not available"); },
};

function makeCtx(overrides?: Partial<ToolContext>): ToolContext {
  return {
    sessionId: "test-session",
    connection: stubConnection,
    signal: AbortSignal.timeout(5000),
    llm: makeMockLLM("respuesta del sub-agente"),
    ...overrides,
  };
}

describe("invokeAgentTool", () => {
  test("retorna el texto generado por el sub-agente", async () => {
    const ctx = makeCtx({ llm: makeMockLLM("resultado de coding") });
    const result = await invokeAgentTool.execute(
      { id: "tc-1", name: "invoke_agent", arguments: { agent_id: "coding", task: "escribe un hola mundo" } },
      ctx,
    );
    expect(result).toBe("resultado de coding");
  });

  test("retorna error cuando ctx.llm no está definido", async () => {
    const ctx = makeCtx({ llm: undefined });
    const result = await invokeAgentTool.execute(
      { id: "tc-2", name: "invoke_agent", arguments: { agent_id: "writing", task: "escribe algo" } },
      ctx,
    );
    expect(result).toContain("Error");
    expect(result).toContain("ctx.llm");
  });

  test("llama onSubAgentChange con start y end", async () => {
    const events: Array<{ agentId: string | null; agentName: string }> = [];

    const ctx = makeCtx({
      onSubAgentChange: (agentId, agentName) => {
        events.push({ agentId, agentName });
      },
    });

    await invokeAgentTool.execute(
      { id: "tc-3", name: "invoke_agent", arguments: { agent_id: "research", task: "busca algo" } },
      ctx,
    );

    expect(events.length).toBe(2);
    expect(events[0].agentId).toBe("research");
    expect(events[0].agentName).toBeTruthy();
    expect(events[1].agentId).toBeNull();
  });

  test("onSubAgentChange end se llama aunque el LLM falle", async () => {
    const events: Array<string | null> = [];
    const failingLLM: LLMProvider = {
      async call() {
        throw new Error("LLM error simulado");
      },
    };

    const ctx = makeCtx({
      llm: failingLLM,
      onSubAgentChange: (agentId) => events.push(agentId),
    });

    try {
      await invokeAgentTool.execute(
        { id: "tc-4", name: "invoke_agent", arguments: { agent_id: "coding", task: "tarea" } },
        ctx,
      );
    } catch {
      // el error se propaga; lo que importa es que finally llamó onSubAgentChange(null)
    }

    expect(events[events.length - 1]).toBeNull();
  });

  test("respeta el AbortSignal ya abortado antes de ejecutar", async () => {
    const controller = new AbortController();
    controller.abort();

    const immediateThrowLLM: LLMProvider = {
      async call(_messages, _tools, signal) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        return { toolCalls: [] };
      },
    };

    const ctx = makeCtx({ llm: immediateThrowLLM, signal: controller.signal });

    // el tool no debe lanzar — el agente atrapa errores de tool; aquí comprobamos
    // que el finally de onSubAgentChange se ejecuta (agentId null al final)
    const events: Array<string | null> = [];
    ctx.onSubAgentChange = (id) => events.push(id);

    try {
      await invokeAgentTool.execute(
        { id: "tc-5", name: "invoke_agent", arguments: { agent_id: "writing", task: "tarea" } },
        ctx,
      );
    } catch {
      // propagación esperada cuando el signal está abortado
    }

    // en cualquier caso, el evento de fin debe haberse emitido
    expect(events[events.length - 1]).toBeNull();
  });

  test("pasa context_summary al historial cuando se provee", async () => {
    const capturedMessages: Message[][] = [];

    const capturingLLM: LLMProvider = {
      async call(messages, _tools, _signal, onTextChunk) {
        capturedMessages.push([...messages]);
        await onTextChunk("ok");
        return { toolCalls: [] };
      },
    };

    const ctx = makeCtx({ llm: capturingLLM });
    await invokeAgentTool.execute(
      {
        id: "tc-6",
        name: "invoke_agent",
        arguments: { agent_id: "coding", task: "implementa X", context_summary: "usuario quiere Y" },
      },
      ctx,
    );

    const messages = capturedMessages[0];
    const hasContext = messages.some(
      (m) => typeof m.content === "string" && m.content.includes("usuario quiere Y"),
    );
    expect(hasContext).toBe(true);
  });
});
