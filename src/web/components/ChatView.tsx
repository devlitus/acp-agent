import { useState, useEffect, useRef } from "react";
import { ChatBubble, type ChatMessage } from "./ChatBubble.tsx";
import { ActionCard } from "./ActionCard.tsx";
import { PermissionModal } from "./PermissionModal.tsx";
import { ModeToggle, useMode } from "./ModeToggle.tsx";
import { SessionSidebar } from "./SessionSidebar.tsx";
import { SubAgentIndicator } from "./SubAgentIndicator.tsx";
import { useChatSession } from "../hooks/useChatSession.ts";
import type { AgentConfig } from "../../agents/types.ts";

function EmptyState({ agentIcon, suggestedPrompts, onSelectPrompt }: {
  agentIcon: string;
  suggestedPrompts: string[];
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6">
      <div className="text-center mb-10">
        <p className="text-5xl mb-4">{agentIcon || "◈"}</p>
        <h2 className="text-2xl font-semibold text-on-surface font-display tracking-tight mb-1">
          ¿En qué puedo ayudarte?
        </h2>
        <p className="text-sm text-muted">Tu asistente inteligente está listo</p>
      </div>
      {suggestedPrompts.length > 0 && (
        <div className="w-full max-w-lg space-y-2">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(prompt)}
              className="w-full text-left px-5 py-3.5 bg-surface-high rounded-xl text-sm text-muted hover:bg-surface-highest hover:text-on-surface transition-colors duration-150"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatViewProps {
  agentId: string;
  sessionId: string | null;
  agentConfig?: AgentConfig;
  onBack: () => void;
  onSwitchSession: (sessionId: string) => void;
  onSessionCreated?: (sessionId: string) => void;
}

export function ChatView({ agentId, sessionId, agentConfig, onBack, onSwitchSession, onSessionCreated }: ChatViewProps) {
  const [mode, setMode] = useMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    pendingPermission,
    status,
    suggestedPrompts,
    agentName,
    agentIcon,
    activeSubAgent,
    showEmptyState,
    messagesEndRef,
    send,
    cancel,
    selectPermission,
  } = useChatSession(agentId, sessionId, agentConfig, { onSessionCreated });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sidebarOpen]);

  useEffect(() => {
    if (status === "ready" && messages.length > 0) inputRef.current?.focus();
  }, [status, messages.length]);

  function handleSend(overrideText?: string) {
    const text = (overrideText ?? inputText).trim();
    if (!text || status !== "ready") return;
    send(text);
    setInputText("");
  }

  return (
    <div className="flex flex-col h-screen bg-void">
      {/* Header */}
      <header className="flex items-center justify-between bg-surface/80 backdrop-blur-[20px] px-4 sm:px-6 py-3 flex-shrink-0 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-muted hover:text-primary transition-colors text-sm font-medium font-display"
        >
          ✦ <span className="hidden sm:inline">Nueva conversación</span>
        </button>

        <span className="font-semibold text-on-surface font-display text-sm sm:text-base tracking-tight truncate mx-3">
          {agentName || agentId}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-muted hover:text-primary transition-colors text-xs px-2 py-1 rounded font-display hidden sm:inline"
            aria-expanded={sidebarOpen}
            aria-controls="session-sidebar"
          >
            🕐 Historial
          </button>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-muted hover:text-primary transition-colors sm:hidden"
            aria-expanded={sidebarOpen}
          >
            🕐
          </button>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {sidebarOpen && (
          <SessionSidebar
            currentSessionId={sessionId}
            onSelectSession={(id) => { onSwitchSession(id); setSidebarOpen(false); }}
            onDeleteSession={(id) => { if (id === sessionId) onBack(); }}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto w-full">
            {showEmptyState ? (
              <EmptyState
                agentIcon={agentIcon}
                suggestedPrompts={suggestedPrompts}
                onSelectPrompt={handleSend}
              />
            ) : (
              <>
                {messages.map((msg, i) => {
                  if (msg.role === "action") {
                    return <ActionCard key={i} action={msg} mode={mode} />;
                  }
                  return <ChatBubble key={i} message={msg} />;
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </main>
      </div>

      {pendingPermission && (
        <PermissionModal request={pendingPermission} onSelect={selectPermission} />
      )}

      {activeSubAgent && (
        <SubAgentIndicator
          agentId={activeSubAgent.agentId}
          agentName={activeSubAgent.agentName}
          agentIcon={activeSubAgent.agentIcon}
        />
      )}

      {/* Input area */}
      <footer className="flex-shrink-0 bg-surface px-4 sm:px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={status === "thinking" || status === "connecting" || !!pendingPermission}
            placeholder={status === "connecting" ? "Connecting…" : "Type a message…"}
            className="flex-1 px-4 py-3 bg-void rounded-xl text-sm text-on-surface placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-40 transition-all"
          />
          {status === "thinking" ? (
            <button
              onClick={cancel}
              className="btn-ghost px-5 py-3 text-sm"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || status !== "ready"}
              className="btn-primary px-6 py-3 text-sm"
            >
              Send
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
