-- Baseline schema: per-user JSON snapshot of IndexedDB state.
-- Mirrors the table and policies originally created by hand in the
-- Supabase SQL editor (see docs/data-strategy.md). After the GitHub
-- integration is wired up, run `supabase migration repair --status
-- applied 20260421101900` against the remote so this migration is not
-- re-executed on the first sync.

create table if not exists snapshots (
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
