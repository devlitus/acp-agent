import { useState } from "react";
import type { AgentConfig } from "../../agents/types.ts";
import type { Session } from "../types.ts";

interface AgentSessionGroupProps {
  agent: AgentConfig;
  sessions: Session[];
  deletingId: string | null;
  onSelectSession: (sessionId: string, agentId: string) => void;
  onDelete: (e: React.MouseEvent, sessionId: string) => void;
  relativeTime: (timestamp: number) => string;
}

export function AgentSessionGroup({
  agent,
  sessions,
  deletingId,
  onSelectSession,
  onDelete,
  relativeTime,
}: AgentSessionGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      {/* Cabecera clickable del grupo */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 mb-3 py-1 rounded-lg hover:bg-surface-high transition-colors duration-150 px-2 -mx-2 group"
        aria-expanded={expanded}
        aria-controls={`group-${agent.id}`}
      >
        <span className="text-lg">{agent.icon}</span>
        <span className="text-xs text-muted uppercase tracking-widest font-medium font-display flex-1 text-left">
          {agent.name}
        </span>
        <span className="text-[10px] text-muted font-display bg-surface-highest px-2 py-0.5 rounded-full">
          {sessions.length}
        </span>
        {/* Chevron animado */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform duration-200 ${expanded ? "rotate-90" : "rotate-0"}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Contenido colapsable con animacion CSS */}
      <div
        id={`group-${agent.id}`}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: expanded ? "4000px" : "0px" }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              <button
                onClick={() => onSelectSession(session.id, session.agent_id)}
                className="w-full flex items-center gap-4 p-4 bg-surface-high rounded-xl text-left hover:bg-surface-highest transition-colors duration-150"
              >
                <span className="text-2xl flex-shrink-0">{agent.icon}</span>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-medium text-on-surface text-sm truncate font-display">
                    {session.title || "Untitled Session"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{relativeTime(session.updated_at)}</p>
                </div>
              </button>
              {/* Boton eliminar */}
              <button
                onClick={(e) => onDelete(e, session.id)}
                disabled={deletingId === session.id}
                title="Delete session"
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md
                  text-muted hover:text-red-400 hover:bg-surface-highest
                  opacity-0 group-hover:opacity-100 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === session.id ? (
                  <svg
                    className="animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
