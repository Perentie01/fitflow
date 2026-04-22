import { useEffect, useRef } from 'react';
import type { ChatMessage as ChatMessageType, ProposedChanges } from '../../lib/types';
import { ChatMessage } from './ChatMessage';

interface ChatThreadProps {
  messages: ChatMessageType[];
  proposedChanges?: ProposedChanges;
}

export function ChatThread({ messages, proposedChanges }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-sm text-[var(--text-dim)] text-center">
          Ask your coach anything about your program.
        </p>
      </div>
    );
  }

  const lastAssistantIndex = messages.reduceRight(
    (found, msg, i) => (found === -1 && msg.role === 'assistant' ? i : found),
    -1,
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg, i) => (
        <ChatMessage
          key={i}
          message={msg}
          isLatestAssistant={i === lastAssistantIndex}
          proposedChanges={proposedChanges}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
