import { useEffect, useRef, useState } from "react";
import type { AgentConfig } from "../../agents/types.ts";
import type { Session } from "../types.ts";
import { relativeTime } from "../utils/relativeTime.ts";

interface AgentCardProps {
  agent: AgentConfig;
  sessions: Session[];
  onStart: (agentId: string, agentConfig?: AgentConfig) => void;
  onSelectSession: (sessionId: string, agentId: string, agentConfig?: AgentConfig) => void;
}


interface SessionDropdownProps {
  sessions: Session[];
  agentConfig: AgentConfig;
  onSelect: (sessionId: string, agentId: string, agentConfig?: AgentConfig) => void;
  onClose: () => void;
}

function SessionDropdown({ sessions, agentConfig, onSelect, onClose }: SessionDropdownProps) {
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface-high rounded-xl card-shadow border border-surface-highest overflow-hidden max-h-60 overflow-y-auto">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => { onSelect(session.id, session.agent_id, agentConfig); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-surface-highest transition-colors duration-150"
        >
          <span className="text-sm text-on-surface font-display truncate mr-3">
            {session.title || "Sin título"}
          </span>
          <span className="text-xs text-muted flex-shrink-0">{relativeTime(session.updated_at)}</span>
        </button>
      ))}
    </div>
  );
}

export function AgentCard({ agent, sessions, onStart, onSelectSession }: AgentCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownOpenRef = useRef(false);
  dropdownOpenRef.current = dropdownOpen;

  const audienceLabel = agent.audience === "all"
    ? "For everyone"
    : agent.audience === "technical"
    ? "Advanced"
    : "Mixed";

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!dropdownOpenRef.current) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div className="bg-surface-high rounded-2xl p-6 card-shadow hover:bg-surface-highest transition-colors duration-200 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl leading-none">{agent.icon}</span>
        <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary-ctr text-muted font-display">
          {audienceLabel}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-on-surface font-display mb-2">{agent.name}</h3>
      <p className="text-sm text-muted mb-5 leading-relaxed line-clamp-2">{agent.description}</p>

      <div className="mt-auto space-y-2">
        {sessions.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="btn-primary w-full px-4 py-2.5 text-sm"
            >
              {sessions.length} sesion{sessions.length !== 1 ? "es" : ""} ▾
            </button>
            {dropdownOpen && (
              <SessionDropdown
                sessions={sessions}
                agentConfig={agent}
                onSelect={onSelectSession}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        ) : null}

        <button
          onClick={() => onStart(agent.id, agent)}
          className={
            sessions.length > 0
              ? "w-full px-4 py-2 text-sm rounded-xl border border-surface-highest text-muted hover:text-on-surface hover:bg-surface-highest transition-colors duration-150 font-display"
              : "btn-primary w-full px-4 py-2.5 text-sm"
          }
        >
          Nueva conversación
        </button>
      </div>

      {agent.suggestedPrompts.length > 0 && (
        <div className="mt-5 pt-4 bg-surface-highest rounded-xl px-3 py-3 -mx-0">
          <p className="text-[10px] text-muted uppercase tracking-widest font-medium mb-2">Prueba preguntando</p>
          <ul className="space-y-1.5">
            {agent.suggestedPrompts.slice(0, 3).map((prompt, index) => (
              <li key={index} className="text-xs text-muted/70 truncate leading-snug">
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
