import { useState, useEffect, useCallback } from "react";
import type { Session } from "../types.ts";
import { SessionItem } from "./SessionItem.tsx";

interface SessionSidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
}

export function SessionSidebar({ currentSessionId, onSelectSession, onDeleteSession, onClose }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(() => {
    fetch("/api/sessions?agentId=orchestrator")
      .then((r) => r.json())
      .then(setSessions)
      .catch((err) => console.error("Failed to load sessions:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  function handleDelete(sessionId: string) {
    fetch(`/api/sessions/${sessionId}`, { method: "DELETE" })
      .then((r) => {
        if (r.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          onDeleteSession(sessionId);
        }
      })
      .catch((err) => console.error("Failed to delete session:", err));
  }

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
          <SessionItem
            key={session.id}
            session={session}
            isCurrent={session.id === currentSessionId}
            onSelect={onSelectSession}
            onDelete={handleDelete}
          />
        ))}
      </nav>
    </aside>
  );
}
