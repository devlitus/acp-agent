import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "../components/ChatBubble.tsx";
import type { ToolAction } from "../components/ActionCard.tsx";
import type { PermissionRequest } from "../components/PermissionModal.tsx";
import type { DisplayMessage } from "../../agent/session-store.ts";
import type { AgentConfig } from "../../agents/types.ts";

type ActionItem = { role: "action" } & ToolAction;
export type ConversationItem = ChatMessage | ActionItem;

type ServerMessage =
  | { type: "chunk"; text: string }
  | { type: "action"; toolCallId: string; title: string; status: "running" | "done" | "error" }
  | { type: "action_detail"; toolCallId: string; input: unknown; output: string }
  | { type: "permission"; toolCallId: string; title: string; options: { id: string; name: string; kind: string }[] }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string };

export function useChatSession(agentId: string, sessionId: string | null) {
  const [messages, setMessages] = useState<ConversationItem[]>([]);
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "thinking" | "error">("connecting");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [agentName, setAgentName] = useState<string>("");
  const [agentIcon, setAgentIcon] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showEmptyState = messages.length === 0 && status === "ready";

  // Load agent config (name, icon, suggested prompts)
  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: AgentConfig[]) => {
        const agent = agents.find((a) => a.id === agentId);
        setSuggestedPrompts(agent?.suggestedPrompts ?? []);
        setAgentName(agent?.name ?? "");
        setAgentIcon(agent?.icon ?? "");
      })
      .catch(() => {});
  }, [agentId]);

  // WebSocket connection
  useEffect(() => {
    setMessages([]);
    setPendingPermission(null);
    setStatus("connecting");

    const params = new URLSearchParams({ agentId });
    if (sessionId) params.set("sessionId", sessionId);

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws?${params}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("ready");
    ws.onclose = () => setStatus("error");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (event) => handleServerMessage(JSON.parse(event.data));

    return () => ws.close();
  }, [agentId, sessionId]);

  // Load message history for existing sessions
  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/sessions/${sessionId}/messages`)
      .then((r) => r.json())
      .then((data: DisplayMessage[]) => {
        const history: ConversationItem[] = data.map((m) => {
          if (m.role === "agent") {
            return { role: "agent" as const, text: m.text, streaming: false };
          }
          return { role: "user" as const, text: m.text };
        });
        setMessages(history);
      })
      .catch((err) => console.error("Failed to load history:", err));
  }, [sessionId]);

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "chunk":
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent") {
            return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
          }
          return [...prev, { role: "agent" as const, text: msg.text, streaming: true, timestamp: new Date() }];
        });
        break;

      case "action":
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.role === "action" && (m as ActionItem).toolCallId === msg.toolCallId,
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...(next[idx] as ActionItem), title: msg.title, status: msg.status };
            return next;
          }
          return [...prev, { role: "action" as const, toolCallId: msg.toolCallId, title: msg.title, status: msg.status }];
        });
        break;

      case "action_detail":
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) => m.role === "action" && (m as ActionItem).toolCallId === msg.toolCallId,
          );
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...(next[idx] as ActionItem), input: msg.input, output: msg.output };
          return next;
        });
        break;

      case "permission":
        setPendingPermission({
          toolCallId: msg.toolCallId,
          title: msg.title,
          options: msg.options,
        });
        break;

      case "done":
        setStatus("ready");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent") {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
        break;

      case "error":
        setStatus("error");
        break;
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text || status !== "ready") return;

    setMessages((prev) => [...prev, { role: "user" as const, text, timestamp: new Date() }]);
    setStatus("thinking");
    wsRef.current?.send(JSON.stringify({ type: "prompt", text }));
  }

  function cancel() {
    wsRef.current?.send(JSON.stringify({ type: "cancel" }));
    setStatus("ready");
  }

  function selectPermission(toolCallId: string, optionId: string) {
    wsRef.current?.send(JSON.stringify({ type: "permission", toolCallId, optionId }));
    setPendingPermission(null);
  }

  return {
    messages,
    pendingPermission,
    status,
    suggestedPrompts,
    agentName,
    agentIcon,
    showEmptyState,
    messagesEndRef,
    send,
    cancel,
    selectPermission,
  };
}
