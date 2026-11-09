-- Shared session notes
-- Run once in Supabase SQL Editor after reviewing. This adds a new notes table only.

create table if not exists public.workout_session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists workout_session_notes_session_created_idx
  on public.workout_session_notes (session_id, created_at);

grant select, insert on public.workout_session_notes to authenticated;
alter table public.workout_session_notes enable row level security;

drop policy if exists "Accepted participants can read session notes" on public.workout_session_notes;
create policy "Accepted participants can read session notes"
on public.workout_session_notes for select
to authenticated
using (
  exists (
    select 1 from public.workout_session_participants participant
    where participant.session_id = workout_session_notes.session_id
      and participant.user_id = (select auth.uid())
      and participant.status = 'accepted'
  )
);

drop policy if exists "Accepted participants can add their session notes" on public.workout_session_notes;
create policy "Accepted participants can add their session notes"
on public.workout_session_notes for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.workout_session_participants participant
    where participant.session_id = workout_session_notes.session_id
      and participant.user_id = (select auth.uid())
      and participant.status = 'accepted'
  )
);
