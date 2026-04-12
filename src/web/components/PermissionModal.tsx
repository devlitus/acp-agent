export type PermissionRequest = {
  toolCallId: string;
  title: string;
  options: {
    id: string;
    name: string;
    kind: string;
  }[];
};

interface PermissionModalProps {
  request: PermissionRequest;
  onSelect: (toolCallId: string, optionId: string) => void;
}

function buttonClass(kind: string): string {
  if (kind === "allow_always") {
    return "btn-primary px-4 py-2 text-sm";
  }
  if (kind === "allow_once") {
    return "btn-ghost px-4 py-2 text-sm";
  }
  // deny
  return "px-4 py-2 text-sm rounded-full text-muted hover:text-on-surface transition-colors";
}

export function PermissionModal({ request, onSelect }: PermissionModalProps) {
  return (
    <div className="glass px-5 py-4">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-primary text-base flex-shrink-0 mt-0.5">◈</span>
        <p className="text-sm font-medium text-on-surface font-display leading-snug">{request.title}</p>
      </div>
      <div className="flex gap-2 justify-end">
        {request.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(request.toolCallId, option.id)}
            className={buttonClass(option.kind)}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
