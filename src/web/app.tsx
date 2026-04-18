import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatView } from "./components/ChatView.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./styles/global.css";

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  function handleNewSession() {
    setSessionId(null);
  }

  function handleSwitchSession(id: string) {
    setSessionId(id);
  }

  return (
    <ErrorBoundary onReset={handleNewSession}>
      <ChatView
        agentId="orchestrator"
        sessionId={sessionId}
        onBack={handleNewSession}
        onSwitchSession={handleSwitchSession}
      />
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
