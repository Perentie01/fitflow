// FitFlow coaching edge function.
//
// Accepts { messages, model } from an authenticated client, loads the user's
// latest snapshot from Postgres (respecting RLS via the caller's JWT),
// assembles a coaching system prompt from the active block, and asks either
// Claude or OpenAI to respond — optionally via a `propose_changes` tool that
// mirrors src/lib/types.ts ProposedChangesSchema.
//
// Response: { reply: string, proposed_changes?: ProposedChanges }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredBlock {
  id?: number;
  block_id: string;
  block_name: string;
  is_active: 0 | 1;
  created_at?: string;
}

interface StoredWorkout {
  id?: number;
  block_id: string;
  day: string;
  exercise_name: string;
  category: string;
  type: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  rest: number;
  cues: string;
  guidance?: string;
  resistance?: string;
  description?: string;
}

interface StoredProgress {
  id?: number;
  workout_id: number;
  set_number: number;
  completed_reps?: number;
  completed_weight?: number;
  completed_duration?: number;
  completed_at: string;
  notes?: string;
}

interface Snapshot {
  blocks?: StoredBlock[];
  workouts?: StoredWorkout[];
  progress?: StoredProgress[];
  savedAt?: string;
}

// ─── JSON Schema for propose_changes (mirrors ProposedChangesSchema) ────────

const WORKOUT_PROPS = {
  block_id: { type: 'string' },
  day: { type: 'string' },
  exercise_name: { type: 'string' },
  category: {
    type: 'string',
    enum: ['Intent', 'Warm-up', 'Primary', 'Secondary', 'Additional', 'Cool-down'],
  },
  type: { type: 'string', enum: ['weights', 'time', 'mindset', 'cardio'] },
  sets: { type: 'integer', minimum: 1 },
  reps: { type: 'integer', minimum: 1 },
  weight: { type: 'number', minimum: 0 },
  duration: { type: 'number', exclusiveMinimum: 0 },
  distance: { type: 'number', exclusiveMinimum: 0 },
  rest: { type: 'integer', minimum: 0 },
  cues: { type: 'string' },
  guidance: { type: 'string' },
  resistance: { type: 'string' },
  description: { type: 'string' },
};

const WORKOUT_INPUT_SCHEMA = {
  type: 'object',
  properties: WORKOUT_PROPS,
  required: ['block_id', 'day', 'exercise_name', 'category', 'type', 'sets', 'rest', 'cues'],
};

const WORKOUT_PATCH_SCHEMA = {
  type: 'object',
  properties: WORKOUT_PROPS,
};

const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    block_id: { type: 'string' },
    day: { type: 'string' },
    exercise_name: { type: 'string' },
  },
  required: ['block_id', 'day', 'exercise_name'],
};

const PROPOSE_CHANGES_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      description: 'Small, surgical edits to the active block.',
      properties: {
        type: { type: 'string', enum: ['targeted'] },
        operations: {
          type: 'array',
          minItems: 1,
          items: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  op: { type: 'string', enum: ['add'] },
                  workout: WORKOUT_INPUT_SCHEMA,
                },
                required: ['op', 'workout'],
              },
              {
                type: 'object',
                properties: {
                  op: { type: 'string', enum: ['modify'] },
                  match: MATCH_SCHEMA,
                  patch: WORKOUT_PATCH_SCHEMA,
                },
                required: ['op', 'match', 'patch'],
              },
              {
                type: 'object',
                properties: {
                  op: { type: 'string', enum: ['delete'] },
                  match: MATCH_SCHEMA,
                },
                required: ['op', 'match'],
              },
            ],
          },
        },
      },
      required: ['type', 'operations'],
    },
    {
      type: 'object',
      description: 'Full replacement of every workout in the active block.',
      properties: {
        type: { type: 'string', enum: ['full'] },
        block_id: { type: 'string' },
        workouts: {
          type: 'array',
          minItems: 1,
          items: WORKOUT_INPUT_SCHEMA,
        },
      },
      required: ['type', 'block_id', 'workouts'],
    },
  ],
};

const TOOL_DESCRIPTION =
  'Propose changes to the user\'s active workout block. Only call this tool when the user explicitly asks you to change, add, remove, or replace exercises. Use "targeted" for individual edits and "full" only when replacing the entire block.';

// ─── Request handler ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Supabase environment not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  let body: { messages?: ChatMessage[]; model?: 'claude' | 'openai' };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const messages = body.messages ?? [];
  const model: 'claude' | 'openai' = body.model === 'openai' ? 'openai' : 'claude';

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages array is required' }, 400);
  }

  // snapshots has user_id as PK with RLS — one row per user.
  const { data: snapRows, error: snapErr } = await supabase
    .from('snapshots')
    .select('data')
    .order('saved_at', { ascending: false })
    .limit(1);

  if (snapErr) {
    console.error('Snapshot query failed', snapErr);
    return json({ error: 'Could not load program snapshot' }, 500);
  }

  if (!snapRows || snapRows.length === 0) {
    return json({
      code: 'no_snapshot',
      reply:
        "I don't see a program for your account yet — import one on the Workouts tab and I can help from there.",
    });
  }

  const snapshot = (snapRows[0].data ?? {}) as Snapshot;
  const activeBlock = (snapshot.blocks ?? []).find((b) => b.is_active === 1);
  const activeWorkouts = activeBlock
    ? (snapshot.workouts ?? []).filter((w) => w.block_id === activeBlock.block_id)
    : [];
  const recentProgress = recentProgressWithNames(snapshot);

  const systemPrompt = buildSystemPrompt({ activeBlock, activeWorkouts, recentProgress });

  try {
    const result =
      model === 'openai'
        ? await callOpenAI(systemPrompt, messages)
        : await callClaude(systemPrompt, messages);
    return json(result);
  } catch (err) {
    console.error('Model call failed', err);
    return json({ error: 'Coaching model call failed' }, 502);
  }
});

// ─── Snapshot helpers ───────────────────────────────────────────────────────

function recentProgressWithNames(snapshot: Snapshot) {
  const workoutById = new Map<number, StoredWorkout>();
  for (const w of snapshot.workouts ?? []) {
    if (typeof w.id === 'number') workoutById.set(w.id, w);
  }

  return (snapshot.progress ?? [])
    .slice()
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, 50)
    .map((p) => {
      const w = workoutById.get(p.workout_id);
      return {
        exercise_name: w?.exercise_name,
        day: w?.day,
        set_number: p.set_number,
        completed_reps: p.completed_reps,
        completed_weight: p.completed_weight,
        completed_duration: p.completed_duration,
        completed_at: p.completed_at,
        notes: p.notes,
      };
    });
}

function buildSystemPrompt(ctx: {
  activeBlock: StoredBlock | undefined;
  activeWorkouts: StoredWorkout[];
  recentProgress: ReturnType<typeof recentProgressWithNames>;
}): string {
  const { activeBlock, activeWorkouts, recentProgress } = ctx;

  const programSection = activeBlock
    ? [
        `Active block: ${activeBlock.block_name} (block_id: "${activeBlock.block_id}")`,
        'Workouts in this block (JSON):',
        JSON.stringify(activeWorkouts, null, 2),
      ].join('\n')
    : 'No active block is set. Encourage the user to activate a block before proposing changes.';

  const progressSection = recentProgress.length
    ? [
        'Recent progress (most-recent first, up to 50 sets):',
        JSON.stringify(recentProgress, null, 2),
      ].join('\n')
    : 'No progress has been logged yet.';

  return [
    "You are FitFlow Coach, an AI strength & conditioning coach embedded in the user's workout tracking app.",
    '',
    'Responsibilities:',
    '- Answer questions about the active program and recent progress concisely.',
    '- When the user asks you to change, add, remove, or replace exercises, call the propose_changes tool.',
    '- For small edits, use type="targeted" with individual operations.',
    '- For a full block rewrite, use type="full" and include every workout for the block.',
    '- Always keep block_id equal to the current active block unless the user is explicitly starting a new block.',
    '- Use these exact snake_case fields: block_id, day, exercise_name, category, type, sets, reps, weight, duration, distance, rest, cues, guidance, resistance, description.',
    '- Exercise types: weights (needs reps; weight optional), time (needs duration), mindset (duration optional), cardio (duration and/or distance).',
    '- Categories: Intent, Warm-up, Primary, Secondary, Additional, Cool-down.',
    '- If a user asks a question and no change is needed, respond in plain text without calling the tool.',
    '',
    '## Current program',
    programSection,
    '',
    '## ' + 'Recent progress',
    progressSection,
  ].join('\n');
}

// ─── Model callers ──────────────────────────────────────────────────────────

interface CoachResult {
  reply: string;
  proposed_changes?: unknown;
}

async function callClaude(systemPrompt: string, messages: ChatMessage[]): Promise<CoachResult> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          name: 'propose_changes',
          description: TOOL_DESCRIPTION,
          input_schema: PROPOSE_CHANGES_SCHEMA,
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  let reply = '';
  let proposed_changes: unknown;

  for (const block of data.content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') {
      reply += block.text;
    } else if (block.type === 'tool_use' && block.name === 'propose_changes') {
      proposed_changes = block.input;
    }
  }

  return {
    reply: reply.trim() || (proposed_changes ? "Here's what I'd change — review below." : ''),
    proposed_changes,
  };
}

async function callOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<CoachResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'propose_changes',
            description: TOOL_DESCRIPTION,
            parameters: PROPOSE_CHANGES_SCHEMA,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  const reply: string = message?.content ?? '';
  let proposed_changes: unknown;

  for (const call of message?.tool_calls ?? []) {
    if (call.function?.name === 'propose_changes') {
      try {
        proposed_changes = JSON.parse(call.function.arguments ?? '{}');
      } catch (err) {
        console.warn('Failed to parse propose_changes arguments', err);
      }
    }
  }

  return {
    reply: reply.trim() || (proposed_changes ? "Here's what I'd change — review below." : ''),
    proposed_changes,
  };
}
