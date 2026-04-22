interface Phase {
  label: string;
  active: boolean;
}

interface OrchestratorStatusBarProps {
  status: "thinking" | "ready" | "connecting" | "error";
  activeSubAgent: { agentId: string; agentName: string; agentIcon: string } | null;
  hasRunningAction: boolean;
  hasFirstChunk: boolean;
}

export function OrchestratorStatusBar({
  status,
  activeSubAgent,
  hasRunningAction,
  hasFirstChunk,
}: OrchestratorStatusBarProps) {
  if (status !== "thinking") return null;

  const phases: Phase[] = [
    { label: "Analizando", active: true },
    {
      label: activeSubAgent
        ? `Delegando → ${activeSubAgent.agentIcon} ${activeSubAgent.agentName}`
        : "Delegando",
      active: activeSubAgent !== null,
    },
    { label: "Ejecutando", active: hasRunningAction },
    { label: "Respondiendo", active: hasFirstChunk },
  ];

  const currentPhaseIndex = [...phases].reverse().findIndex((p) => p.active);
  const activeIndex =
    currentPhaseIndex === -1 ? 0 : phases.length - 1 - currentPhaseIndex;

  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-surface/60 border-b border-outline/10 flex-shrink-0">
      {phases.map((phase, i) => (
        <span key={phase.label} className="flex items-center gap-1.5">
          <span
            className={`text-xs font-display transition-colors duration-300 ${
              phase.active ? "text-primary" : "text-muted/30"
            } ${i === activeIndex ? "relative" : ""}`}
          >
            {phase.label}
            {i === activeIndex && (
              <span className="ml-1 inline-block w-1 h-1 rounded-full bg-primary animate-pulse align-middle" />
            )}
          </span>
          {i < phases.length - 1 && (
            <span className="text-muted/20 text-xs select-none">→</span>
          )}
        </span>
      ))}
    </div>
  );
}
