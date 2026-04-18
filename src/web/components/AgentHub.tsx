import { useEffect, useMemo, useState } from "react";
import type { AgentConfig } from "../../agents/types.ts";
import { AgentCard } from "./AgentCard.tsx";
import type { Session } from "../types.ts";

interface AgentHubProps {
  onSelectAgent: (agentId: string, agentConfig?: AgentConfig) => void;
  onSelectSession: (sessionId: string, agentId: string, agentConfig?: AgentConfig) => void;
}

export function AgentHub({ onSelectAgent, onSelectSession }: AgentHubProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/sessions/recent"),
      ]);
      if (!agentsRes.ok || !sessionsRes.ok) {
        throw new Error("Error al cargar los datos del servidor");
      }
      const agentsData = await agentsRes.json();
      const sessionsData = await sessionsRes.json();
      const sortedAgents = [...agentsData].sort((a: AgentConfig, b: AgentConfig) => {
        const order: Record<AgentConfig["audience"], number> = { all: 0, mixed: 1, technical: 2 };
        return order[a.audience] - order[b.audience];
      });
      setAgents(sortedAgents);
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  const sessionsByAgent = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.agent_id) ?? [];
      list.push(s);
      map.set(s.agent_id, list);
    }
    return map;
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <p className="text-muted font-display text-sm tracking-widest uppercase animate-pulse">Cargando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <p className="text-red-400 font-display text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <header className="bg-surface/80 backdrop-blur-[20px] sticky top-0 z-10 px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-on-surface font-display tracking-tight">
            ACP Agent Platform
          </h1>
          <p className="mt-1 text-sm text-muted">Elige un agente especializado para ayudarte con tus tareas</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <p className="text-[11px] text-muted uppercase tracking-widest font-medium font-display mb-6">
          Agentes disponibles
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              sessions={sessionsByAgent.get(agent.id) ?? []}
              onStart={onSelectAgent}
              onSelectSession={onSelectSession}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
