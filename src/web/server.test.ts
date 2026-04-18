import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { createServer } from "./server.ts";

const WS_TIMEOUT = 5000;

let server: ReturnType<typeof createServer>;
let base: string;
let createdSessionIds: string[] = [];

beforeAll(() => {
  server = createServer(0);
  base = `http://localhost:${server.port}`;
});

afterAll(async () => {
  for (const sessionId of createdSessionIds) {
    await fetch(`${base}/api/sessions/${sessionId}`, { method: "DELETE" });
  }
  server.stop(true);
});

// ──────────────────────────────────────────
// GET /api/agents
// ──────────────────────────────────────────

describe("GET /api/agents", () => {
  test("returns 200 with a non-empty array", async () => {
    const res = await fetch(`${base}/api/agents`);
    expect(res.status).toBe(200);

    const agents = await res.json() as unknown[];
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  test("each agent has id, name, icon, and suggestedPrompts", async () => {
    const res = await fetch(`${base}/api/agents`);
    const agents = await res.json() as Record<string, unknown>[];

    for (const agent of agents) {
      expect(typeof agent.id).toBe("string");
      expect(typeof agent.name).toBe("string");
      expect(typeof agent.icon).toBe("string");
      expect(Array.isArray(agent.suggestedPrompts)).toBe(true);
    }
  });
});

// ──────────────────────────────────────────
// POST /api/sessions
// ──────────────────────────────────────────

describe("POST /api/sessions", () => {
  test("creates a session and returns sessionId", async () => {
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "coding" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(typeof data.sessionId).toBe("string");
    expect((data.sessionId as string).length).toBeGreaterThan(0);
    createdSessionIds.push(data.sessionId as string);
  });

  test("uses 'coding' as default agentId when not provided", async () => {
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(typeof data.sessionId).toBe("string");
    createdSessionIds.push(data.sessionId as string);
  });
});

// ──────────────────────────────────────────
// GET /api/sessions?agentId=
// ──────────────────────────────────────────

describe("GET /api/sessions", () => {
  test("returns 200 with array for a valid agentId", async () => {
    const res = await fetch(`${base}/api/sessions?agentId=coding`);
    expect(res.status).toBe(200);
    const sessions = await res.json();
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("returns 400 when agentId param is missing", async () => {
    const res = await fetch(`${base}/api/sessions`);
    expect(res.status).toBe(400);

    const body = await res.text();
    expect(body).toBe("Missing agentId");
  });

  test("session created via POST appears in GET list", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "writing" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };
    createdSessionIds.push(sessionId);

    const listRes = await fetch(`${base}/api/sessions?agentId=writing`);
    const sessions = await listRes.json() as { id: string }[];

    expect(sessions.some(s => s.id === sessionId)).toBe(true);
  });
});

// ──────────────────────────────────────────
// GET /api/sessions/recent
// ──────────────────────────────────────────

describe("GET /api/sessions/recent", () => {
  test("returns 200 with an array", async () => {
    const res = await fetch(`${base}/api/sessions/recent`);
    expect(res.status).toBe(200);

    const sessions = await res.json();
    expect(Array.isArray(sessions)).toBe(true);
  });

  test("created sessions appear in recent list", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "coding" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };
    createdSessionIds.push(sessionId);

    const res = await fetch(`${base}/api/sessions/recent`);
    const sessions = await res.json() as { id: string }[];

    expect(sessions.some((s) => s.id === sessionId)).toBe(true);
  });
});

// ──────────────────────────────────────────
// GET /api/sessions/:id/messages
// ──────────────────────────────────────────

describe("GET /api/sessions/:id/messages", () => {
  test("returns empty array for a newly created session", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "coding" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };
    createdSessionIds.push(sessionId);

    const res = await fetch(`${base}/api/sessions/${sessionId}/messages`);
    expect(res.status).toBe(200);

    const messages = await res.json();
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("returns 404 for a non-existent session ID", async () => {
    const res = await fetch(`${base}/api/sessions/this-does-not-exist/messages`);
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────
// GET /ws — WebSocket upgrade
// ──────────────────────────────────────────

describe("WebSocket /ws", () => {
  test("successfully upgrades the connection", async () => {
    const wsUrl = `ws://localhost:${server.port}/ws?agentId=coding`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timed out"));
      }, WS_TIMEOUT);

      ws.addEventListener("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.addEventListener("error", (event) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${JSON.stringify(event)}`));
      });
    });
  });
});

// ──────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────

describe("Orchestrator en /api/agents", () => {
  test("el agente orchestrator aparece en la lista", async () => {
    const res = await fetch(`${base}/api/agents`);
    const agents = await res.json() as { id: string }[];

    expect(agents.some((a) => a.id === "orchestrator")).toBe(true);
  });

  test("el orchestrator tiene name, icon y suggestedPrompts", async () => {
    const res = await fetch(`${base}/api/agents`);
    const agents = await res.json() as Record<string, unknown>[];
    const orch = agents.find((a) => a.id === "orchestrator");

    expect(orch).toBeDefined();
    expect(typeof orch!.name).toBe("string");
    expect(typeof orch!.icon).toBe("string");
    expect(Array.isArray(orch!.suggestedPrompts)).toBe(true);
  });
});

describe("Sesiones con agentId orchestrator", () => {
  test("crea una sesión para orchestrator correctamente", async () => {
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "orchestrator" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { sessionId: string };
    expect(typeof data.sessionId).toBe("string");
    createdSessionIds.push(data.sessionId);
  });

  test("sesiones de orchestrator aparecen en el listado", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "orchestrator" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };
    createdSessionIds.push(sessionId);

    const listRes = await fetch(`${base}/api/sessions?agentId=orchestrator`);
    expect(listRes.status).toBe(200);
    const sessions = await listRes.json() as { id: string }[];
    expect(sessions.some((s) => s.id === sessionId)).toBe(true);
  });

  test("la sesión de orchestrator aparece en /api/sessions/recent", async () => {
    const createRes = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "orchestrator" }),
    });
    const { sessionId } = await createRes.json() as { sessionId: string };
    createdSessionIds.push(sessionId);

    const recentRes = await fetch(`${base}/api/sessions/recent`);
    const sessions = await recentRes.json() as { id: string }[];
    expect(sessions.some((s) => s.id === sessionId)).toBe(true);
  });
});

describe("General HTTP behavior", () => {
  test("returns 404 for unknown paths", async () => {
    const res = await fetch(`${base}/unknown/path`);
    expect(res.status).toBe(404);
  });
});
