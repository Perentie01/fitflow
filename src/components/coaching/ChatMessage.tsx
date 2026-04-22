import type { ChatMessage as ChatMessageType, ProposedChanges } from '../../lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatestAssistant: boolean;
  proposedChanges?: ProposedChanges;
}

export function ChatMessage({ message, isLatestAssistant, proposedChanges }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[var(--accent-dim)] text-[var(--accent-text)] rounded-br-sm'
            : 'bg-[var(--bg-raised)] text-[var(--text)] rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && isLatestAssistant && proposedChanges && (
          <p className="mt-2 text-xs text-[var(--accent)] border-t border-[var(--border-subtle)] pt-2">
            Changes proposed ↓
          </p>
        )}
      </div>
    </div>
  );
}
