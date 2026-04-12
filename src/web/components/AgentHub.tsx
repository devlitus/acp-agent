import { useEffect, useState } from "react";
import type { AgentConfig } from "../../agents/types.ts";
import { AgentCard } from "./AgentCard.tsx";

interface Session {
  id: string;
  agent_id: string;
  title: string;
  updated_at: string;
}

interface AgentHubProps {
  onSelectAgent: (agentId: string) => void;
  onSelectSession: (sessionId: string, agentId: string) => void;
}

export function AgentHub({ onSelectAgent, onSelectSession }: AgentHubProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/sessions?agentId=coding"),
      ]);
      const agentsData = await agentsRes.json();
      const sessionsData = await sessionsRes.json();
      const sortedAgents = [...agentsData].sort((a: AgentConfig, b: AgentConfig) => {
        const order = { all: 0, mixed: 1, technical: 2 };
        return order[a.audience] - order[b.audience];
      });
      setAgents(sortedAgents);
      setRecentSessions(sessionsData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  function relativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const d = Math.floor(diffMs / 86400000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function agentIcon(agentId: string): string {
    return agents.find(a => a.id === agentId)?.icon ?? "🤖";
  }

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
        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <section>
            <p className="text-[11px] text-muted uppercase tracking-widest font-medium font-display mb-4">
              Recent Sessions
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id, session.agent_id)}
                  className="flex items-center gap-4 p-4 bg-surface-high rounded-xl text-left hover:bg-surface-highest transition-colors duration-150"
                >
                  <span className="text-2xl flex-shrink-0">{agentIcon(session.agent_id)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface text-sm truncate font-display">
                      {session.title || "Untitled Session"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{relativeTime(session.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Agent grid */}
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
