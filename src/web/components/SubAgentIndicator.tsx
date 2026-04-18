interface SubAgentIndicatorProps {
  agentId: string;
  agentName: string;
  agentIcon: string;
}

export function SubAgentIndicator({ agentName, agentIcon }: SubAgentIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 mx-auto max-w-4xl w-full">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-high rounded-lg text-sm text-muted animate-pulse">
        <span className="text-base leading-none">{agentIcon || "◈"}</span>
        <span className="font-display">
          {agentName} procesando…
        </span>
      </div>
    </div>
  );
}
