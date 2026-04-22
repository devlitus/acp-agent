interface DelegationBubbleProps {
  agentIcon: string;
  agentName: string;
}

export function DelegationBubble({ agentIcon, agentName }: DelegationBubbleProps) {
  return (
    <div className="flex items-center justify-center gap-2 my-3">
      <span className="flex-1 h-px bg-outline/20 max-w-[80px]" />
      <span className="text-xs text-muted/50 font-display flex items-center gap-1.5">
        <span>{agentIcon}</span>
        <span>{agentName}</span>
        <span className="text-muted/30">· delegando</span>
      </span>
      <span className="flex-1 h-px bg-outline/20 max-w-[80px]" />
    </div>
  );
}
