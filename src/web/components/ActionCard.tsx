import { useState } from "react";

export type ToolAction = {
  toolCallId: string;
  title: string;
  status: "running" | "done" | "error";
  input?: unknown;
  output?: string;
};

interface ActionCardProps {
  action: ToolAction;
  mode: "simple" | "advanced";
}

function StatusIcon({ status }: { status: ToolAction["status"] }) {
  if (status === "running") return <span className="animate-spin inline-block text-primary text-xs">⚙</span>;
  if (status === "done") return <span className="text-emerald-400 text-xs">✓</span>;
  return <span className="text-red-400 text-xs">✗</span>;
}

export function ActionCard({ action, mode }: ActionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-start gap-2.5 py-2 px-3 my-1 bg-surface rounded-lg text-xs text-muted">
      <StatusIcon status={action.status} />
      <div className="flex-1 min-w-0">
        <span className="truncate">{action.title}</span>
        {mode === "advanced" && (
          <>
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-primary/60 hover:text-primary ml-2 transition-colors"
            >
              {open ? "▲" : "▼"}
            </button>
            {open && (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-muted/50 uppercase tracking-wider">Input</p>
                <pre className="bg-void text-muted text-[11px] p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(action.input, null, 2)}
                </pre>
                <p className="text-[10px] text-muted/50 uppercase tracking-wider">Output</p>
                <pre className="bg-void text-muted text-[11px] p-3 rounded-lg overflow-x-auto">
                  {action.output}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
