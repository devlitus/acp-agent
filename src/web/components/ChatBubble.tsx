import { marked } from "marked";
import { useState } from "react";

export type UserMessage = {
  role: "user";
  text: string;
  timestamp?: Date;
};

export type AgentMessage = {
  role: "agent";
  text: string;
  streaming: boolean;
  timestamp?: Date;
};

export type ChatMessage = UserMessage | AgentMessage;

interface ChatBubbleProps {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3 group">
        <div className="flex flex-col items-end gap-0.5 max-w-[85%] sm:max-w-[75%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium text-on-primary"
            style={{ background: "linear-gradient(135deg, #7e51ff, #b6a0ff)" }}
          >
            {message.text}
          </div>
          {message.timestamp && (
            <span className="text-[10px] text-muted/40 opacity-0 group-hover:opacity-100 transition-opacity px-1">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>
      </div>
    );
  }

  const html = marked.parse(message.text) as string;

  return (
    <div className="flex justify-start mb-3 group">
      <div className="flex flex-col gap-0.5 max-w-[85%] sm:max-w-[75%]">
        <div className="relative bg-surface-high px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-muted">
          <div
            className="[&_p]:mb-2 [&_p]:text-muted [&_a]:text-primary [&_a]:underline [&_code]:bg-surface-highest [&_code]:text-primary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-void [&_pre]:text-muted [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:text-muted [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:text-muted [&_h1]:text-on-surface [&_h1]:font-display [&_h2]:text-on-surface [&_h2]:font-display [&_h3]:text-on-surface [&_h3]:font-display [&_strong]:text-on-surface"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {message.streaming && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-1 rounded-sm animate-pulse" />
          )}
          {!message.streaming && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted/50 hover:text-primary px-1.5 py-0.5 rounded bg-surface-highest"
            >
              {copied ? "✓" : "Copy"}
            </button>
          )}
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-muted/40 opacity-0 group-hover:opacity-100 transition-opacity px-1">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
