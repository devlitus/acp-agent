import type * as acp from "@agentclientprotocol/sdk";
import type { Tool, ToolContext } from "./types.ts";
import type { ToolCall } from "../llm/types.ts";
import { runSubAgentLoop } from "./invoke-agent-loop.ts";

export const invokeAgentTool: Tool = {
  definition: {
    name: "invoke_agent",
    description: "Delega una tarea a un agente especializado. Usa esta herramienta cuando la tarea requiera capacidades específicas como código, investigación web, escritura o gestión de notas.",
    parameters: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Identificador del sub-agente: coding, writing, research, personal, data, devops",
          enum: ["coding", "writing", "research", "personal", "data", "devops"],
        },
        task: {
          type: "string",
          description: "Descripción completa de la tarea que debe realizar el sub-agente",
        },
        context_summary: {
          type: "string",
          description: "Contexto relevante de la conversación actual (opcional)",
        },
      },
      required: ["agent_id", "task"],
    },
  },
  kind: "other" as acp.ToolKind,
  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<string> {
    // Importaciones lazy para evitar ciclos de módulo en tiempo de carga:
    // tools/index.ts → invoke-agent.ts → agents/index.ts → agents/registry.ts → tools/index.ts
    const { registry: agentRegistry } = await import("../agents/index.ts");
    const { registry: toolRegistry } = await import("./index.ts");

    const { agent_id, task, context_summary } = toolCall.arguments as {
      agent_id: string;
      task: string;
      context_summary?: string;
    };

    if (!ctx.llm) {
      return "Error: invoke_agent requiere un LLMProvider en el contexto (ctx.llm no está definido).";
    }

    const config = agentRegistry.get(agent_id);
    const systemPrompt = agentRegistry.getSystemPrompt(config);

    const history = [
      { role: "system" as const, content: systemPrompt },
      ...(context_summary
        ? [
            { role: "user" as const, content: `Contexto previo: ${context_summary}` },
            { role: "assistant" as const, content: "Entendido, tengo el contexto." },
          ]
        : []),
      { role: "user" as const, content: task },
    ];

    ctx.onSubAgentChange?.(agent_id, config.name, config.icon);

    const subToolRegistry = toolRegistry.forAgent(config.tools);
    const signal = ctx.signal ?? AbortSignal.timeout(120_000);

    let result: string;
    try {
      result = await runSubAgentLoop(
        ctx.llm,
        history,
        subToolRegistry,
        ctx.sessionId,
        signal,
        ctx.onSubAgentChange,
      );
    } finally {
      ctx.onSubAgentChange?.(null, "", "");
    }

    return result || "El sub-agente completó la tarea sin generar texto.";
  },
};
