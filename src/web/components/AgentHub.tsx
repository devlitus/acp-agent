import { useEffect, useState } from "react";
import type { AgentConfig } from "../../agents/types.ts";
import { AgentCard } from "./AgentCard.tsx";
import { AgentSessionGroup } from "./AgentSessionGroup.tsx";
import type { Session } from "../types.ts";

interface AgentHubProps {
  onSelectAgent: (agentId: string) => void;
  onSelectSession: (sessionId: string, agentId: string) => void;
}

export function AgentHub({ onSelectAgent, onSelectSession }: AgentHubProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/sessions"),
      ]);
      const agentsData = await agentsRes.json();
      const sessionsData = await sessionsRes.json();
      const sortedAgents = [...agentsData].sort((a: AgentConfig, b: AgentConfig) => {
        const order = { all: 0, mixed: 1, technical: 2 };
        return order[a.audience] - order[b.audience];
      });
      setAgents(sortedAgents);
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function relativeTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const d = Math.floor(diffMs / 86400000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  // Agrupa las sesiones por agente, conservando solo los agentes que tienen sesiones
  const sessionsByAgent = agents
    .map((agent) => ({
      agent,
      sessions: sessions.filter((s) => s.agent_id === agent.id),
    }))
    .filter(({ sessions }) => sessions.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <p className="text-muted font-display text-sm tracking-widest uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-[20px] sticky top-0 z-10 px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-on-surface font-display tracking-tight">
            ACP Agent Platform
          </h1>
          <p className="mt-1 text-sm text-muted">Choose a specialized agent to help you with your tasks</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-16">
        {/* Sesiones agrupadas por agente */}
        {sessionsByAgent.length > 0 && (
          <section className="space-y-10">
            <p className="text-[11px] text-muted uppercase tracking-widest font-medium font-display">
              Recent Sessions
            </p>
            {sessionsByAgent.map(({ agent, sessions: agentSessions }) => (
              <AgentSessionGroup
                key={agent.id}
                agent={agent}
                sessions={agentSessions}
                deletingId={deletingId}
                onSelectSession={onSelectSession}
                onDelete={handleDelete}
                relativeTime={relativeTime}
              />
            ))}
          </section>
        )}

        {/* Grid de agentes */}
        <section>
          <p className="text-[11px] text-muted uppercase tracking-widest font-medium font-display mb-6">
            Available Agents
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onStart={onSelectAgent} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
