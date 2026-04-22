import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ChatView } from "./components/ChatView.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { SetupPage } from "./components/SetupPage.tsx";

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data: { setupRequired: boolean }) => setSetupRequired(data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) {
    // Cargando estado inicial
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Iniciando...</p>
      </div>
    );
  }

  if (setupRequired) {
    return <SetupPage />;
  }

  function handleNewSession() {
    setSessionId(null);
    setChatKey((k) => k + 1);
  }

  function handleSwitchSession(id: string) {
    setSessionId(id);
  }

  function handleSessionCreated(id: string) {
    setSessionId(id);
  }

  return (
    <ErrorBoundary onReset={handleNewSession}>
      <ChatView
        key={chatKey}
        agentId="orchestrator"
        sessionId={sessionId}
        onBack={handleNewSession}
        onSwitchSession={handleSwitchSession}
        onSessionCreated={handleSessionCreated}
      />
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
