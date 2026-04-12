import { marked } from "marked";

export type UserMessage = {
  role: "user";
  text: string;
};

export type AgentMessage = {
  role: "agent";
  text: string;
  streaming: boolean;
};

export type ChatMessage = UserMessage | AgentMessage;

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-sm font-medium text-on-primary"
          style={{ background: "linear-gradient(135deg, #7e51ff, #b6a0ff)" }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  const html = marked.parse(message.text) as string;

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-surface-high px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] text-sm text-muted">
        <div
          className="[&_p]:mb-2 [&_p]:text-muted [&_a]:text-primary [&_a]:underline [&_code]:bg-surface-highest [&_code]:text-primary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-void [&_pre]:text-muted [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:text-muted [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:text-muted [&_h1]:text-on-surface [&_h1]:font-display [&_h2]:text-on-surface [&_h2]:font-display [&_h3]:text-on-surface [&_h3]:font-display [&_strong]:text-on-surface"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 bg-primary ml-1 rounded-sm animate-pulse" />
        )}
      </div>
    </div>
  );
}
