import { supabase } from './supabase';
import type { ChatMessage, ProposedChanges } from './types';
import { ProposedChangesSchema } from './types';

export interface CoachResponse {
  reply: string;
  proposed_changes?: ProposedChanges;
}

const ERROR_MESSAGES: Record<string, string> = {
  401: 'Please sign in again',
  429: 'Too many requests — try again in a moment',
  NO_SNAPSHOT: 'No program found — import a program first',
  NETWORK: 'Could not reach the coaching service',
};

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
    throw new Error(ERROR_MESSAGES.NETWORK);
  }

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) throw new Error(ERROR_MESSAGES[401]);
    if (status === 429) throw new Error(ERROR_MESSAGES[429]);
    const message = (error as { message?: string }).message ?? '';
    if (message.includes('NO_SNAPSHOT')) throw new Error(ERROR_MESSAGES.NO_SNAPSHOT);
    throw new Error(ERROR_MESSAGES.NETWORK);
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
