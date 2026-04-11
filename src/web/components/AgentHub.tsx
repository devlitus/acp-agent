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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/sessions?agentId=coding"),
      ]);

      const agentsData = await agentsRes.json();
      const sessionsData = await sessionsRes.json();

      const sortedAgents = [...agentsData].sort((a: AgentConfig, b: AgentConfig) => {
        const audienceOrder = { all: 0, mixed: 1, technical: 2 };
        return audienceOrder[a.audience] - audienceOrder[b.audience];
      });

      setAgents(sortedAgents);
      setRecentSessions(sessionsData.slice(0, 5));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getAgentIcon(agentId: string): string {
    const agent = agents.find(a => a.id === agentId);
    return agent?.icon || "🤖";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">ACP Agent Platform</h1>
          <p className="mt-2 text-gray-600">Choose a specialized agent to help you with your tasks</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 italic">No recent sessions</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id, session.agent_id)}
                  className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all text-left"
                >
                  <span className="text-2xl flex-shrink-0">{getAgentIcon(session.agent_id)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{session.title || "Untitled Session"}</p>
                    <p className="text-sm text-gray-500">{formatRelativeTime(session.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Agents</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onStart={onSelectAgent} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
