import { useState, useEffect } from "react";

interface Session {
  id: string;
  title: string | null;
  updated_at: number;
}

interface SessionSidebarProps {
  agentId: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "Ahora mismo";
  if (m < 60) return `Hace ${m}m`;
  if (h < 24) return `Hace ${h}h`;
  if (d < 7) return `Hace ${d}d`;
  return new Date(timestamp).toLocaleDateString();
}

export function SessionSidebar({ agentId, currentSessionId, onSelectSession, onClose }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?agentId=${agentId}`)
      .then((r) => r.json())
      .then(setSessions)
      .catch((err) => console.error("Failed to load sessions:", err))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <aside
      id="session-sidebar"
      className="fixed top-0 left-0 h-full z-50 w-72 sm:relative sm:top-auto sm:left-auto sm:h-full sm:z-auto sm:w-64 bg-surface flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[11px] text-muted uppercase tracking-widest font-medium font-display">Historial</p>
        <button
          onClick={onClose}
          className="text-muted hover:text-on-surface transition-colors text-lg leading-none"
          aria-label="Cerrar historial"
        >
          ×
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading && (
          <p className="px-5 py-3 text-xs text-muted/60 animate-pulse">Cargando…</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="px-5 py-3 text-xs text-muted/50 italic">Sin sesiones anteriores</p>
        )}
        {!loading && sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`w-full text-left px-5 py-3 hover:bg-surface-high transition-colors duration-100 ${
              session.id === currentSessionId
                ? "bg-surface-highest border-l-2 border-primary"
                : ""
            }`}
          >
            <p className="text-sm font-medium text-on-surface truncate font-display">
              {session.title || "Sin título"}
            </p>
            <p className="text-xs text-muted/60 mt-0.5">{formatRelativeTime(session.updated_at)}</p>
          </button>
        ))}
      </nav>
    </aside>
  );
}
