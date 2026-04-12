import type { AgentConfig } from "../../agents/types.ts";

interface AgentCardProps {
  agent: AgentConfig;
  onStart: (agentId: string) => void;
}

export function AgentCard({ agent, onStart }: AgentCardProps) {
  const audienceLabel = agent.audience === "all"
    ? "For everyone"
    : agent.audience === "technical"
    ? "Advanced"
    : "Mixed";

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

      <button
        onClick={() => onStart(agent.id)}
        className="btn-primary w-full px-4 py-2.5 text-sm mt-auto"
      >
        Start Chat
      </button>

      {agent.suggestedPrompts.length > 0 && (
        <div className="mt-5 pt-4 bg-surface-highest rounded-xl px-3 py-3 -mx-0">
          <p className="text-[10px] text-muted uppercase tracking-widest font-medium mb-2">Try asking</p>
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
