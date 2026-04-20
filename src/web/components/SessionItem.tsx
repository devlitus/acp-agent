import { useState, useRef, useEffect } from "react";
import type { Session } from "../types.ts";
import { relativeTime } from "../utils/relativeTime.ts";

interface SessionItemProps {
  session: Session;
  isCurrent: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SessionItem({ session, isCurrent, onSelect, onDelete }: SessionItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [fading, setFading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirming) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [confirming]);

  function handleConfirm() {
    setFading(true);
    setTimeout(() => onDelete(session.id), 200);
  }

  if (confirming) {
    return (
      <div ref={rootRef} className={`transition-all duration-200 ${fading ? "opacity-0 -translate-x-4" : ""}`}>
        <div className="flex items-center justify-between px-5 py-3 bg-red-900/15 border-l-2 border-red-500/50">
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-sm font-medium truncate font-display text-red-300">
              {session.title || "Sin título"}
            </p>
            <p className="text-xs mt-0.5 text-red-400/70">¿Eliminar esta sesión?</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={handleConfirm}
              className="px-2.5 py-1 text-[10px] font-semibold bg-red-600/80 hover:bg-red-500 text-white rounded transition-colors"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2.5 py-1 text-[10px] font-semibold bg-surface-high hover:bg-surface-highest text-muted rounded transition-colors"
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="group relative">
      <button
        onClick={() => onSelect(session.id)}
        className={`w-full text-left px-5 py-3 pr-10 hover:bg-surface-high transition-colors duration-100 ${
          isCurrent ? "bg-surface-highest border-l-2 border-primary" : ""
        }`}
      >
        <p className="text-sm font-medium truncate font-display text-on-surface">
          {session.title || "Sin título"}
        </p>
        <p className="text-xs mt-0.5 text-muted/60">{relativeTime(session.updated_at)}</p>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted/40 hover:text-red-400 transition-all duration-150 p-1"
        aria-label={`Eliminar sesión ${session.title || "Sin título"}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
