# AI Coaching Chat — Parallel Implementation Plan

## Status: Block A complete. Blocks B–G ready to run in parallel.

---

## Feature overview

In-app AI coaching chat. User sends messages; a Supabase edge function reads their current program snapshot and calls Claude or OpenAI. The AI can propose workout changes (targeted or full replacement) which the user previews and applies locally.

- **No chat history persistence** — each session is ephemeral.
- **Both Claude and OpenAI** supported; model stored in `localStorage`.
- **Config tab** moves into an overflow menu within the Coaching tab.

---

## Shared contract (Block A — DONE)

`src/lib/types.ts` now exports:

- `ChatMessage` / `ChatMessageSchema` — `{ role: 'user' | 'assistant', content: string }`
- `ProposedChanges` / `ProposedChangesSchema` — discriminated union:
  - `type: 'targeted'` → `operations: Array<{ op: 'add' | 'modify' | 'delete', ... }>`
  - `type: 'full'` → `{ block_id: string, workouts: StoredWorkoutInput[] }`
- `TargetedOperation` — individual operation type

Import from `'../lib/types'` (or adjust relative path as needed).

---

## Block B — Supabase scaffold + edge function

**Owner:** one agent  
**Touches:** `supabase/**` (all new), `.env.example`, `package.json` scripts only

### What to build

1. `supabase/config.toml` — standard `supabase init` output; project ref can be left as placeholder.

2. `supabase/functions/coach/index.ts` — Deno edge function:
   - Verify JWT via `@supabase/supabase-js` (use the request's `Authorization` header).
   - `SELECT data FROM snapshots WHERE user_id = auth.uid() ORDER BY saved_at DESC LIMIT 1`
   - Extract from `data`: `blocks`, `workouts`, `progress` (see snapshot shape below).
   - Find active block: `blocks.find(b => b.is_active === 1)`.
   - Filter workouts: `workouts.filter(w => w.block_id === activeBlock.block_id)`.
   - Include recent progress: last 50 `progress` rows joined to workout exercise names for context.
   - Build system prompt → call model with **tool use / function calling** so proposed changes come back as structured JSON matching `ProposedChangesSchema`.
   - Return `{ reply: string, proposed_changes?: ProposedChanges }`.
   - If no snapshot: return friendly reply with no `proposed_changes`, HTTP 200.

3. `supabase/functions/coach/deno.json` — import map (Anthropic + OpenAI Deno SDKs or raw `fetch`).

4. `.env.example`:
   ```
   SUPABASE_URL=
   SUPABASE_ANON_KEY=
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   ```

5. `package.json` — add scripts:
   ```json
   "supabase:start": "supabase start",
   "supabase:functions:serve": "supabase functions serve coach --env-file .env.local",
   "supabase:functions:deploy": "supabase functions deploy coach"
   ```

### Snapshot shape (from `src/lib/sync.ts`)

```ts
{
  blocks: Array<{ id: number, block_id: string, block_name: string, is_active: 0 | 1, created_at: string }>,
  workouts: Array<StoredWorkout>,  // see src/lib/types.ts StoredWorkout
  progress: Array<Progress>,       // see src/lib/types.ts Progress
  savedAt: string
}
```

### Request body from client

```ts
{ messages: ChatMessage[], model: 'claude' | 'openai' }
```

---

## Block C — Dexie helpers + apply logic

**Owner:** one agent  
**Touches:** `src/lib/database.ts` (extend), `src/lib/coachingApply.ts` (new), `src/lib/coachingApply.test.ts` (new)

### What to build

1. Extend `dbHelpers` in `src/lib/database.ts` with:
   ```ts
   updateWorkoutById(id: number, patch: Partial<StoredWorkout>): Promise<void>
   deleteWorkoutById(id: number): Promise<void>
   addWorkout(workout: Omit<StoredWorkout, 'id'>): Promise<number>  // returns new id
   ```
   Existing: `importWorkouts`, `deleteWorkoutsByBlock` — reuse these for the `full` path.

2. New `src/lib/coachingApply.ts`:
   ```ts
   export async function applyProposedChanges(
     changes: ProposedChanges,
     activeBlockId: string,
     reloadBlocks: () => Promise<void>,
     saveSnapshot: (userId: string) => Promise<void>,
     userId: string,
   ): Promise<void>
   ```
   - `targeted`: for each operation, resolve `match` (`block_id + day + exercise_name`) via Dexie query to get the numeric `id`, then call the appropriate helper.
   - `full`: `deleteWorkoutsByBlock(block_id)` → `importWorkouts(workouts)`.
   - After applying: call `reloadBlocks()` then `saveSnapshot(userId)`.

3. `src/lib/coachingApply.test.ts` — unit tests using a fake Dexie instance (or mock dbHelpers):
   - `targeted` add, modify, delete each work correctly.
   - `full` replacement clears and reloads.
   - `reloadBlocks` and `saveSnapshot` are called once per apply.

---

## Block D — Client edge-function wrapper

**Owner:** one agent  
**Touches:** `src/lib/coach.ts` (new only)

### What to build

```ts
// src/lib/coach.ts
import { supabase } from './supabase';
import type { ChatMessage, ProposedChanges } from './types';
import { ProposedChangesSchema } from './types';

export interface CoachResponse {
  reply: string;
  proposed_changes?: ProposedChanges;
}

export async function sendCoachMessage(params: {
  messages: ChatMessage[];
  model: 'claude' | 'openai';
}): Promise<CoachResponse>
```

- Uses `supabase.functions.invoke('coach', { body: params })` — Supabase client auto-attaches JWT.
- On success: validate `proposed_changes` with `ProposedChangesSchema.safeParse()` if present; surface invalid schema as a console warning but still return the reply.
- Map error codes to user-friendly messages:
  - 401 → "Please sign in again"
  - 429 → "Too many requests — try again in a moment"
  - No snapshot (custom code from edge function) → "No program found — import a program first"
  - Network error → "Could not reach the coaching service"

---

## Block E — Chat UI shell

**Owner:** one agent  
**Touches:** `src/components/coaching/` (all new files)

### What to build

All under `src/components/coaching/`:

1. **`ChatThread.tsx`** — scrollable list of `ChatMessage[]`; auto-scrolls to bottom on new message; empty state: "Ask your coach anything about your program."

2. **`ChatMessage.tsx`** — single bubble:
   - User: right-aligned, amber accent background.
   - Assistant: left-aligned, `bg-bg-raised`.
   - If message is the latest assistant message and `proposed_changes` is present: show a subtle footer "Changes proposed ↓" (the preview panel is in CoachingTab, not here).
   - Design tokens from `DESIGN.md`: Geist font, 12px border-radius cards, 8px base unit spacing.

3. **`ChatInput.tsx`** — textarea + send button:
   - Enter sends, Shift+Enter inserts newline.
   - Disabled + spinner while `isLoading`.
   - Props: `onSend: (text: string) => void`, `isLoading: boolean`.

4. **`ModelSelector.tsx`** — segmented control (two options: "Claude" / "GPT"):
   - Persists to `localStorage` key `coaching.model` (values `'claude'` | `'openai'`).
   - Props: `value`, `onChange`.

**Stub `sendCoachMessage`** until Block D lands:
```ts
// temporary stub at top of ChatThread or CoachingTab
const sendCoachMessage = async (_: any) => ({
  reply: 'Coaching coming soon.',
  proposed_changes: undefined,
});
```

---

## Block F — Program changes preview

**Owner:** one agent  
**Touches:** `src/components/coaching/ProgramChangesPreview.tsx` (new only)

### What to build

```tsx
interface Props {
  changes: ProposedChanges;
  onApply: () => void;
  onDiscard: () => void;
  isApplying: boolean;
}
```

Two rendering branches:

1. **`type: 'targeted'`** — grouped by day, show:
   - Add (green label): exercise name + key fields (sets × reps / duration).
   - Modify (amber label): exercise name + before/after diff of changed fields.
   - Delete (red label): exercise name + day.

2. **`type: 'full'`** — stacked table of all proposed workouts grouped by day; header says "Full program replacement for [block_id]".

Footer: **Apply** button (shows spinner when `isApplying`) + **Discard** button.

**Stub `applyProposedChanges`** until Block C lands — `onApply` is a prop so the parent controls calling it; this component is purely presentational.

---

## Block G — Nav + Config relocation

**Owner:** one agent  
**Touches:** `src/components/BottomNav.tsx`, `src/App.tsx`, `src/components/CoachingTab.tsx` (new skeleton)

### What to build

1. **`src/components/BottomNav.tsx`** — swap the Config tab entry for Coaching:
   - Icon: `MessageCircle` from `lucide-react` (already a dependency).
   - Tab id: `'coaching'`, label: `'Coaching'`.
   - Remove `'config'` tab entry.

2. **`src/App.tsx`** — in the `AppContent` render:
   - Replace `{activeTab === 'config' && <ConfigTab ... />}` with `{activeTab === 'coaching' && <CoachingTab ... />}`.
   - Pass `reloadBlocks` and any other needed props to `CoachingTab`.
   - Keep `ConfigTab` imported — it'll be used inside the overflow menu.

3. **`src/components/CoachingTab.tsx`** — skeleton layout:
   - Header row: title "Coaching", `<ModelSelector />` (placeholder import), overflow kebab/settings icon.
   - Clicking overflow: opens a Radix `Dialog` containing `<ConfigTab />` — pass through all required props (`reloadBlocks`, etc.).
   - Placeholder body: `{/* ChatThread + ProgramChangesPreview slots — wired in Phase 3 */}`
   - Look at `ImportDialog.tsx` and `components/ui/dialog.jsx` for the Dialog pattern to follow.

---

## Phase 3 — Integration (after B–G merged)

One agent wires everything:

1. Replace stubs in `CoachingTab.tsx` with real `ChatThread`, `ChatInput`, `ProgramChangesPreview`.
2. Wire `sendCoachMessage` from `src/lib/coach.ts` into the send handler.
3. Wire `applyProposedChanges` from `src/lib/coachingApply.ts` into the Apply button.
4. Pass `reloadBlocks` (from `BlockContext`) and `saveSnapshot` (from sync hook) into `applyProposedChanges`.
5. E2E manual smoke test per verification checklist below.

### Verification checklist

- [ ] Coaching tab renders in bottom nav; Workouts and Progress unaffected.
- [ ] Overflow menu opens ConfigTab in a dialog; import/export still works.
- [ ] Send a plain message → assistant reply, no preview panel.
- [ ] Ask for a targeted change ("swap bench for incline bench on day 2") → preview panel with targeted diff.
- [ ] Ask for full rewrite → preview panel with full replacement table.
- [ ] Click Apply → Workouts tab reflects changes; snapshot saves to Supabase.
- [ ] Click Discard → changes dismissed, thread continues.
- [ ] Toggle model selector → next request uses the other model.
- [ ] Auth: unauthenticated request → edge function returns 401.

---

## Key files reference

| File | Purpose |
|---|---|
| `src/lib/types.ts` | Shared types — **read-only for Blocks B–G** |
| `src/lib/database.ts` | Dexie DB layer — **Block C only** |
| `src/lib/sync.ts` | Snapshot save — read to understand `saveSnapshot` signature |
| `src/lib/supabase.ts` | Supabase client — import for edge function calls |
| `src/context/BlockContext.tsx` | `reloadBlocks()` lives here |
| `src/components/ImportDialog.tsx` | Dialog pattern reference |
| `src/components/ui/dialog.jsx` | Radix Dialog wrapper |
| `DESIGN.md` | Design tokens — typography, color, spacing |
| `docs/data-strategy.md` | Background on Supabase + AI proxy approach |
