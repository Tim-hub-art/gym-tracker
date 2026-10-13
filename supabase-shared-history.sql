-- Shared workout history source
-- Run this once in Supabase SQL Editor. It does not delete or alter existing workout history.

alter table public.workout_history
  add column if not exists shared_session_id uuid
  references public.workout_sessions(id) on delete set null;

create index if not exists workout_history_shared_session_id_idx
  on public.workout_history(shared_session_id);

create or replace function public.finish_workout_session(target_session_id uuid, exercise_names jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.workout_sessions;
begin
  select * into target_session
  from public.workout_sessions
  where id = target_session_id
  for update;

  if target_session.id is null then
    raise exception 'Workout session not found.';
  end if;

  if not public.is_accepted_workout_session_participant(target_session_id) then
    raise exception 'Only accepted participants can finish this session.';
  end if;

  if target_session.completed_at is not null then
    raise exception 'This session has already been finished.';
  end if;

  if exists (
    select 1
    from public.workout_session_participants participant
    cross join lateral jsonb_array_elements_text(target_session.exercise_ids) exercise(exercise_id)
    left join public.workout_session_results result
      on result.session_id = target_session_id
      and result.participant_id = participant.user_id
      and result.exercise_id = exercise.exercise_id::integer
    where participant.status = 'accepted'
      and (result.id is null or jsonb_array_length(result.sets) = 0)
  ) then
    raise exception 'Save every exercise for every accepted participant before finishing the session.';
  end if;

  insert into public.workout_history (user_id, exercise_name, sets, shared_session_id)
  select result.participant_id, exercise_names ->> result.exercise_id::text, result.sets, target_session_id
  from public.workout_session_results result
  where result.session_id = target_session_id;

  update public.workout_sessions
  set completed_at = now()
  where id = target_session_id;

  update public.workout_session_participants
  set status = 'left'
  where session_id = target_session_id
    and status in ('pending', 'accepted');
end;
$$;
