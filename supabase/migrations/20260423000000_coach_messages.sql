create table coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table coach_messages enable row level security;

create policy "Users can read own messages"
  on coach_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on coach_messages for insert
  with check (auth.uid() = user_id);
