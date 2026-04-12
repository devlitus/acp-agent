import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AgentHub } from "./components/AgentHub.tsx";
import { ChatView } from "./components/ChatView.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./styles/global.css";

type View = "hub" | "chat";

function App() {
  const [currentView, setCurrentView] = useState<View>("hub");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  function handleSelectAgent(agentId: string) {
    setSelectedAgentId(agentId);
    setSelectedSessionId(null);
    setCurrentView("chat");
  }

  function handleSelectSession(sessionId: string, agentId: string) {
    setSelectedSessionId(sessionId);
    setSelectedAgentId(agentId);
    setCurrentView("chat");
  }

  function handleBackToHub() {
    setCurrentView("hub");
    setSelectedAgentId(null);
    setSelectedSessionId(null);
  }

  function handleSwitchSession(sessionId: string) {
    setSelectedSessionId(sessionId);
  }

  if (currentView === "hub") {
    return (
      <ErrorBoundary>
        <AgentHub
          onSelectAgent={handleSelectAgent}
          onSelectSession={handleSelectSession}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onReset={handleBackToHub}>
      <ChatView
        agentId={selectedAgentId!}
        sessionId={selectedSessionId}
        onBack={handleBackToHub}
        onSwitchSession={handleSwitchSession}
      />
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
