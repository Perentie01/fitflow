# FitFlow Data Strategy

## Overview

FitFlow uses a **local-first architecture**. IndexedDB (via Dexie) is the source of truth for all UI operations. Supabase provides authentication and acts as a remote backup/sync layer. The UI never waits for the network.

## Current State

- All data lives in IndexedDB via Dexie (`src/lib/database.ts`)
- Three tables: `blocks`, `workouts`, `progress`
- Data access is abstracted behind `dbHelpers` in `src/lib/database.ts`
- No authentication exists today
- App is hosted on GitHub Pages at a public URL

## Target Architecture

```
IndexedDB (Dexie)          — instant reads/writes, always works offline
      ↕
Supabase Auth              — identity anchor (Google OAuth or magic link)
      ↕
Supabase DB (snapshot)     — single JSON blob per user, cross-device restore
```

-----

## Supabase Setup (one-time, manual)

These steps are performed once in the Supabase dashboard before any code changes.

1. Create a new Supabase project
1. Enable Auth > Providers > Google (or Email magic link)
1. Add the following to Auth > URL Configuration > Redirect URLs:
- `https://<username>.github.io/fitflow`
- `http://localhost:5173` (for local dev)
1. Create the following table in the SQL editor:

```sql
create table snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  saved_at timestamptz not null default now()
);

alter table snapshots enable row level security;

create policy "Users can read own snapshot"
  on snapshots for select
  using (auth.uid() = user_id);

create policy "Users can upsert own snapshot"
  on snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own snapshot"
  on snapshots for update
  using (auth.uid() = user_id);
```

1. Copy the project URL and anon key from Project Settings > API

-----

## Environment Variables

Add to `.env.local` (never commit):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

-----

## Implementation Blocks

Each block below is independently safe to implement and test. They have no circular dependencies and can be handed to an agent one at a time.

-----

### Block 1 — Install Supabase and create client

**Files touched:** `src/lib/supabase.ts` (new)

**Task:** Install the Supabase JS SDK and export a typed client instance.

```bash
npm install @supabase/supabase-js
```

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Acceptance criteria:**

- `supabase` client exports without error
- No existing files are modified
- `.env.local` is added to `.gitignore` if not already present

-----

### Block 2 — Add Auth context

**Files touched:** `src/context/AuthContext.tsx` (new), `src/App.tsx` (wrap with provider)

**Task:** Create an `AuthContext` that exposes the current Supabase user and a `signIn` / `signOut` function. Wrap `App` with the provider.

```typescript
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

**In `src/App.tsx`:** wrap the existing `<BlockProvider>` with `<AuthProvider>`.

**Acceptance criteria:**

- `useAuth()` returns `user: null` before sign-in
- `signIn()` redirects to Google OAuth
- After redirect back, `user` is populated
- No changes to `BlockContext`, `dbHelpers`, or any UI component beyond `App.tsx`

-----

### Block 3 — Add sync helpers

**Files touched:** `src/lib/sync.ts` (new)

**Task:** Implement `saveSnapshot` and `restoreSnapshot` functions that serialize/deserialize the full Dexie database to/from a single Supabase row.

```typescript
// src/lib/sync.ts
import { supabase } from './supabase'
import { db } from './database'

export async function saveSnapshot(userId: string): Promise<void> {
  const snapshot = {
    blocks: await db.blocks.toArray(),
    workouts: await db.workouts.toArray(),
    progress: await db.progress.toArray(),
    savedAt: new Date().toISOString()
  }

  const { error } = await supabase
    .from('snapshots')
    .upsert({ user_id: userId, data: snapshot, saved_at: new Date().toISOString() })

  if (error) console.error('Snapshot save failed:', error)
}

export async function restoreSnapshot(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (error || !data) return false

  await db.blocks.bulkPut(data.data.blocks)
  await db.workouts.bulkPut(data.data.workouts)
  await db.progress.bulkPut(data.data.progress)

  return true
}
```

**Acceptance criteria:**

- `saveSnapshot` upserts without error when called with a valid user ID
- `restoreSnapshot` populates IndexedDB from remote data and returns `true`
- `restoreSnapshot` returns `false` gracefully if no snapshot exists yet
- No UI components are modified

-----

### Block 4 — Wire sync into the app lifecycle

**Files touched:** `src/context/AuthContext.tsx`, `src/App.tsx` or `src/hooks/useSync.ts` (new)

**Task:** Trigger `restoreSnapshot` on login and `saveSnapshot` periodically and on visibility change.

```typescript
// src/hooks/useSync.ts
import { useEffect, useRef } from 'react'
import { saveSnapshot, restoreSnapshot } from '../lib/sync'
import { useAuth } from '../context/AuthContext'

export function useSync(onRestored?: () => void) {
  const { user } = useAuth()
  const hasRestored = useRef(false)

  // Restore once on login
  useEffect(() => {
    if (!user || hasRestored.current) return
    hasRestored.current = true
    restoreSnapshot(user.id).then(restored => {
      if (restored) onRestored?.()
    })
  }, [user])

  // Save on tab hide and every 60s
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveSnapshot(user.id)
      }
    }

    const interval = setInterval(() => saveSnapshot(user.id), 60_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])
}
```

Call `useSync(() => reloadBlocks())` in `App.tsx` so the UI refreshes after a remote restore.

**Acceptance criteria:**

- On first login from a new device, remote data appears in the UI
- Snapshot is saved when the tab is hidden
- Snapshot is saved every 60 seconds while the app is open
- No sync occurs when `user` is null (unauthenticated)

-----

### Block 5 — Add sign-in UI

**Files touched:** `src/components/AuthGate.tsx` (new), `src/App.tsx`

**Task:** Show a sign-in screen when the user is not authenticated. The rest of the app renders only when a user is present.

```typescript
// src/components/AuthGate.tsx
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth()

  if (loading) return (
    <div className="h-dvh flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading...</span>
    </div>
  )

  if (!user) return (
    <div className="h-dvh flex flex-col items-center justify-center gap-6">
      <h1 className="font-display text-4xl">
        Fit<span className="text-primary">Flow</span>
      </h1>
      <Button onClick={signIn}>Sign in with Google</Button>
    </div>
  )

  return <>{children}</>
}
```

**In `src/App.tsx`:** wrap the main content with `<AuthGate>`.

**Acceptance criteria:**

- Unauthenticated users see the sign-in screen only
- Authenticated users see the full app
- Loading state prevents flash of sign-in screen on page reload
- Sign-out can be triggered from `useAuth().signOut()` (wire into Header later)

-----

### Block 6 — Add sign-out to Header

**Files touched:** `src/components/Header.tsx`

**Task:** Add a sign-out button to the existing Header component using `useAuth`.

**Acceptance criteria:**

- Clicking sign out calls `saveSnapshot` then `supabase.auth.signOut()`
- User is returned to the sign-in screen after sign out
- The existing dark mode toggle is unchanged

-----

## Sync Conflict Policy

This app uses **last-write-wins at the snapshot level**. This is acceptable because:

- FitFlow is a single-user personal app
- Simultaneous multi-device writes are not a realistic use case
- Progress entries are append-only and time-stamped

If a more granular merge strategy is needed in future (e.g. per-row upsert), the `saveSnapshot` / `restoreSnapshot` pair in `src/lib/sync.ts` is the only file that needs to change. All other layers are unaffected.

-----

## Future: Model API Proxy

When direct model calls are needed (replacing the current copy-paste AI workflow):

- Add a Supabase Edge Function as a thin proxy to Anthropic/OpenAI
- The Edge Function reads the API key from Supabase Vault (never exposed to client)
- The client calls the Edge Function with the user's JWT — no extra auth setup needed
- The existing `AI_COPY_TEMPLATE` in `src/lib/types.ts` becomes the default system prompt

This is a separate workstream and has no dependencies on Blocks 1–6 above.

-----

## File Change Summary

| File                          | Status                    | Block   |
|-------------------------------|---------------------------|---------|
| `src/lib/supabase.ts`         | New                       | 1       |
| `src/context/AuthContext.tsx` | New                       | 2       |
| `src/lib/sync.ts`             | New                       | 3       |
| `src/hooks/useSync.ts`        | New                       | 4       |
| `src/components/AuthGate.tsx` | New                       | 5       |
| `src/components/Header.tsx`   | Modified (minor)          | 6       |
| `src/App.tsx`                 | Modified (wrap providers) | 2, 4, 5 |
| `.env.local`                  | New (not committed)       | 1       |
| `.gitignore`                  | Modified (add .env.local) | 1       |

No changes to `database.ts`, `BlockContext.tsx`, `dbHelpers`, or any UI component outside `Header.tsx` and `App.tsx`.
