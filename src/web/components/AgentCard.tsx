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
    : "Mixed audience";

  const audienceClass = agent.audience === "all" 
    ? "bg-blue-100 text-blue-800" 
    : "bg-purple-100 text-purple-800";

  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="text-4xl">{agent.icon}</div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${audienceClass}`}>
            {audienceLabel}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
        
        <button
          onClick={() => onStart(agent.id)}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Start Chat
        </button>

        {agent.suggestedPrompts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <ul className="space-y-1">
              {agent.suggestedPrompts.slice(0, 3).map((prompt, index) => (
                <li key={index} className="text-xs text-gray-600 truncate">
                  • {prompt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
