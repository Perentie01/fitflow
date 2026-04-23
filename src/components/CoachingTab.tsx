import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfigTab } from './ConfigTab';
import { ChatThread } from './coaching/ChatThread';
import { ChatInput } from './coaching/ChatInput';
import { ModelSelector, getStoredModel } from './coaching/ModelSelector';
import { ProgramChangesPreview } from './coaching/ProgramChangesPreview';
import { sendCoachMessage } from '../lib/coach';
import { applyProposedChanges } from '../lib/coachingApply';
import { useBlock } from '../context/BlockContext';
import { useAuth } from '../context/AuthContext';
import { saveSnapshot } from '../lib/sync';
import type { ChatMessage, ProposedChanges } from '../lib/types';
import type { CoachModel } from './coaching/ModelSelector';

export const CoachingTab = () => {
  const [configOpen, setConfigOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposedChanges, setProposedChanges] = useState<ProposedChanges | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [model, setModel] = useState<CoachModel>(getStoredModel);

  const { reloadBlocks, activeBlock } = useBlock();
  const { user } = useAuth();

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await sendCoachMessage({ messages: nextMessages, model });
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.reply };
      setMessages(prev => [...prev, assistantMsg]);
      if (response.proposed_changes) {
        setProposedChanges(response.proposed_changes);
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!proposedChanges || !activeBlock || !user) return;
    setIsApplying(true);
    try {
      await applyProposedChanges(
        proposedChanges,
        activeBlock.block_id,
        reloadBlocks,
        saveSnapshot,
        user.id,
      );
      setProposedChanges(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscard = () => {
    setProposedChanges(null);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Coaching</h1>
        <div className="flex items-center gap-2">
          <ModelSelector value={model} onChange={setModel} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigOpen(true)}
            aria-label="Open settings"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ChatThread messages={messages} proposedChanges={proposedChanges ?? undefined} />

      {proposedChanges && (
        <ProgramChangesPreview
          changes={proposedChanges}
          onApply={handleApply}
          onDiscard={handleDiscard}
          isApplying={isApplying}
        />
      )}

      <ChatInput onSend={handleSend} isLoading={isLoading} />

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <ConfigTab />
        </DialogContent>
      </Dialog>
    </div>
  );
};
