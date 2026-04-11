import { sessionStore } from "../agent/session-store.ts";
import { ACPWebSocketBridge, type BridgeData } from "./bridge.ts";
import { registry as agentRegistry } from "../agents/index.ts";

export function createServer(port: number = 3000): Bun.Server<BridgeData> {
  return Bun.serve<BridgeData>({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      if (url.pathname === "/api/agents" && req.method === "GET") {
        return handleGetAgents();
      }

      if (url.pathname === "/api/sessions" && req.method === "GET") {
        const agentId = url.searchParams.get("agentId");
        if (!agentId) return new Response("Missing agentId", { status: 400 });
        return handleGetSessions(agentId);
      }

      if (url.pathname === "/api/sessions" && req.method === "POST") {
        return handleCreateSession(req);
      }

      if (url.pathname === "/ws") {
        const agentId = url.searchParams.get("agentId") || "coding";
        const sessionId = url.searchParams.get("sessionId") || undefined;
        return handleWebSocketUpgrade(req, server, agentId, sessionId);
      }

      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        const bridge = new ACPWebSocketBridge(ws);
        ws.data.bridge = bridge;
        bridge.start(ws.data.agentId, ws.data.sessionId);
      },
      message(ws, message) {
        ws.data.bridge?.handleClientMessage(message.toString());
      },
      close(ws) {
        ws.data.bridge?.cleanup();
      },
    },
  });
}

function handleGetAgents(): Response {
  const agents = agentRegistry.getAll();
  return Response.json(agents);
}

function handleGetSessions(agentId: string): Response {
  const sessions = sessionStore.listByAgent(agentId);
  return Response.json(sessions);
}

async function handleCreateSession(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { agentId?: string };
    const agentId = body.agentId || "coding";
    const sessionId = crypto.randomUUID();
    sessionStore.create(sessionId, agentId);
    return Response.json({ sessionId, agentId });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

function handleWebSocketUpgrade(
  req: Request,
  server: Bun.Server<BridgeData>,
  agentId: string,
  sessionId?: string,
): Response {
  const upgraded = server.upgrade(req, { data: { agentId, sessionId, bridge: null } });

  if (!upgraded) {
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  return new Response();
}
