import { supabase } from './supabase';
import type { ChatMessage, ProposedChanges } from './types';
import { ProposedChangesSchema } from './types';

export const loadChatHistory = async (): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('coach_messages')
    .select('role, content')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[coach] failed to load history:', error.message);
    return [];
  }

  return (data ?? []) as ChatMessage[];
};

export const saveChatMessage = async (message: ChatMessage, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('coach_messages')
    .insert({ role: message.role, content: message.content, user_id: userId });

  if (error) {
    console.warn('[coach] failed to save message:', error.message);
  }
};

export interface CoachResponse {
  reply: string;
  proposed_changes?: ProposedChanges;
}

const NETWORK_ERROR = 'Could not reach the coaching service';

export async function sendCoachMessage(params: {
  messages: ChatMessage[];
  model: 'claude' | 'openai';
}): Promise<CoachResponse> {
  let data: unknown;
  let error: unknown;

  try {
    const result = await supabase.functions.invoke('coach', { body: params });
    data = result.data;
    error = result.error;
  } catch {
    throw new Error(NETWORK_ERROR);
  }

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) throw new Error('Please sign in again');
    if (status === 429) throw new Error('Too many requests — try again in a moment');
    const message = (error as { message?: string }).message ?? '';
    if (message.includes('NO_SNAPSHOT')) throw new Error('No program found — import a program first');
    throw new Error(NETWORK_ERROR);
  }

  const response = data as { reply: string; proposed_changes?: unknown };

  if (response.proposed_changes !== undefined) {
    const parsed = ProposedChangesSchema.safeParse(response.proposed_changes);
    if (!parsed.success) {
      console.warn('[coach] proposed_changes failed schema validation:', parsed.error);
      return { reply: response.reply };
    }
    return { reply: response.reply, proposed_changes: parsed.data };
  }

  return { reply: response.reply };
}
