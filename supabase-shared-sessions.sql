create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  requester_name text,
  recipient_email text not null,
  recipient_id uuid references auth.users(id) on delete set null,
  recipient_name text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, recipient_email)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  creator_email text not null,
  creator_name text,
  title text not null,
  exercise_ids jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  participant_name text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  unique (session_id, email)
);

create table if not exists public.workout_session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  participant_id uuid not null references auth.users(id) on delete cascade,
  exercise_id integer not null,
  sets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (session_id, participant_id, exercise_id)
);

alter table public.workout_sessions
  add column if not exists completed_at timestamptz;

alter table public.workout_session_participants
  drop constraint if exists workout_session_participants_status_check;
alter table public.workout_session_participants
  add constraint workout_session_participants_status_check
  check (status in ('pending', 'accepted', 'declined', 'left'));

alter table public.friend_requests enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_participants enable row level security;
alter table public.workout_session_results enable row level security;

create or replace function public.can_access_workout_session(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workout_session_participants
    where session_id = target_session_id
      and status in ('pending', 'accepted')
      and (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'))
  );
$$;

create or replace function public.is_accepted_workout_session_participant(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workout_session_participants
    where session_id = target_session_id
      and user_id = auth.uid()
      and status = 'accepted'
  );
$$;

create or replace function public.respond_to_friend_request(request_id uuid, next_status text, next_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set status = next_status,
      recipient_id = auth.uid(),
      recipient_name = next_name
  where id = request_id
    and status = 'pending'
    and lower(recipient_email) = lower(auth.jwt() ->> 'email');

  if not found then
    raise exception 'This friend request is no longer available.';
  end if;
end;
$$;

create or replace function public.send_friend_request(recipient_email text, requester_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_request_id uuid;
  current_email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or current_email is null then
    raise exception 'You must be signed in to send a friend request.';
  end if;

  if lower($1) = current_email then
    raise exception 'You cannot add yourself as a friend.';
  end if;

  insert into public.friend_requests (
    requester_id, requester_email, requester_name, recipient_email, status
  ) values (
    auth.uid(), current_email, $2, lower($1), 'pending'
  )
  on conflict (requester_id, recipient_email) do update
  set requester_name = excluded.requester_name,
      status = 'pending',
      recipient_id = null,
      recipient_name = null,
      created_at = now()
  returning id into created_request_id;

  return created_request_id;
end;
$$;

create or replace function public.start_workout_session(
  session_title text,
  session_exercise_ids jsonb,
  invited_friend_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_session_id uuid := gen_random_uuid();
  invited_count integer;
  matched_count integer;
  current_email text := lower(auth.jwt() ->> 'email');
  current_name text := coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', split_part(current_email, '@', 1));
begin
  if auth.uid() is null or current_email is null then
    raise exception 'You must be signed in to start a session.';
  end if;

  invited_count := coalesce(cardinality(invited_friend_ids), 0);
  if invited_count = 0 then
    raise exception 'Choose at least one friend.';
  end if;

  select count(distinct id) into matched_count
  from public.friend_requests
  where status = 'accepted'
    and (
      (requester_id = auth.uid() and recipient_id = any(invited_friend_ids))
      or (recipient_id = auth.uid() and requester_id = any(invited_friend_ids))
    );

  if matched_count <> invited_count then
    raise exception 'One or more selected friends are no longer available.';
  end if;

  insert into public.workout_sessions (id, creator_id, creator_email, creator_name, title, exercise_ids)
  values (new_session_id, auth.uid(), current_email, current_name, $1, $2);

  insert into public.workout_session_participants (session_id, user_id, email, participant_name, status)
  values (new_session_id, auth.uid(), current_email, current_name, 'accepted');

  insert into public.workout_session_participants (session_id, user_id, email, participant_name, status)
  select
    new_session_id,
    case when requester_id = auth.uid() then recipient_id else requester_id end,
    case when requester_id = auth.uid() then recipient_email else requester_email end,
    case when requester_id = auth.uid() then recipient_name else requester_name end,
    'pending'
  from public.friend_requests
  where status = 'accepted'
    and (
      (requester_id = auth.uid() and recipient_id = any(invited_friend_ids))
      or (recipient_id = auth.uid() and requester_id = any(invited_friend_ids))
    );

  return new_session_id;
end;
$$;

create or replace function public.respond_to_session_invite(invitation_id uuid, next_status text, next_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workout_session_participants
  set status = next_status,
      user_id = auth.uid(),
      participant_name = $3
  where id = $1
    and status = 'pending'
    and lower(email) = lower(auth.jwt() ->> 'email');

  if not found then
    raise exception 'This session invitation is no longer available.';
  end if;
end;
$$;

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

  insert into public.workout_history (user_id, exercise_name, sets)
  select result.participant_id, exercise_names ->> result.exercise_id::text, result.sets
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

create or replace function public.update_workout_session_exercises(target_session_id uuid, updated_exercise_ids jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.workout_sessions
    where id = target_session_id
      and creator_id = auth.uid()
      and completed_at is null
  ) then
    raise exception 'Only the session host can change its exercises.';
  end if;

  if jsonb_typeof($2) <> 'array' or jsonb_array_length($2) = 0 then
    raise exception 'A session needs at least one exercise.';
  end if;

  update public.workout_sessions
  set exercise_ids = $2
  where id = $1;
end;
$$;

create or replace function public.leave_workout_session(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workout_session_participants
  set status = 'left'
  where session_id = $1
    and status in ('pending', 'accepted')
    and (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'));

  if not found then
    raise exception 'You are not an active participant in this session.';
  end if;
end;
$$;

drop policy if exists "Friend request participants can view" on public.friend_requests;
drop policy if exists "Users can send friend requests" on public.friend_requests;
drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
drop policy if exists "Participants can view sessions" on public.workout_sessions;
drop policy if exists "Users can create sessions" on public.workout_sessions;
drop policy if exists "Session participants can view members" on public.workout_session_participants;
drop policy if exists "Creators can invite participants" on public.workout_session_participants;
drop policy if exists "Invitees can respond" on public.workout_session_participants;
drop policy if exists "Accepted participants can view results" on public.workout_session_results;
drop policy if exists "Accepted participants can add results" on public.workout_session_results;
drop policy if exists "Accepted participants can update results" on public.workout_session_results;

create policy "Friend request participants can view" on public.friend_requests for select using (requester_id = auth.uid() or lower(recipient_email) = lower(auth.jwt() ->> 'email'));
create policy "Users can send friend requests" on public.friend_requests for insert with check (requester_id = auth.uid() and lower(requester_email) = lower(auth.jwt() ->> 'email'));
create policy "Recipients can respond to friend requests" on public.friend_requests for update using (lower(recipient_email) = lower(auth.jwt() ->> 'email')) with check (recipient_id = auth.uid());

create policy "Participants can view sessions" on public.workout_sessions for select using (public.can_access_workout_session(id));
create policy "Users can create sessions" on public.workout_sessions for insert with check (creator_id = auth.uid());

create policy "Session participants can view members" on public.workout_session_participants for select using (public.can_access_workout_session(session_id));
create policy "Creators can invite participants" on public.workout_session_participants for insert with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.creator_id = auth.uid()));
create policy "Invitees can respond" on public.workout_session_participants for update using (lower(email) = lower(auth.jwt() ->> 'email')) with check (user_id = auth.uid());

create policy "Accepted participants can view results" on public.workout_session_results for select using (public.is_accepted_workout_session_participant(session_id));
create policy "Accepted participants can add results" on public.workout_session_results for insert with check (public.is_accepted_workout_session_participant(session_id));
create policy "Accepted participants can update results" on public.workout_session_results for update using (public.is_accepted_workout_session_participant(session_id));

-- Lets accepted session members see the latest earlier result for the exercises
-- that belong to this session. The exercise list is kept inside this function so
-- the client cannot request another person's unrelated workout history.
create or replace function public.get_workout_session_previous_results(target_session_id uuid)
returns table (
  participant_id uuid,
  exercise_id integer,
  sets jsonb,
  saved_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with session_exercises as (
    select
      item.value::integer as exercise_id,
      case item.value::integer
        when 1 then 'Leg Press'
        when 2 then 'Leg Extension'
        when 3 then 'Prone Leg Curl'
        when 4 then 'Seated Leg Curl'
        when 5 then 'Calf Press'
        when 6 then 'Hip Abduction'
        when 7 then 'Hip Adduction'
        when 8 then 'Lat Pull'
        when 9 then 'Seated Row'
        when 10 then 'Back Extension'
        when 11 then 'Shoulder Press'
        when 12 then 'Abdominal Crunch'
        when 13 then 'Seated Dip'
        when 14 then 'Dip / Chin Assist'
        when 15 then 'Chest Press'
        when 16 then 'Pec Deck'
        when 17 then 'Cable Crossover'
        when 18 then 'Bicep Curl'
        when 19 then 'Tricep Extension'
        when 20 then 'Treadmill'
        when 21 then 'Exercise Bike'
        when 22 then 'Rowing Machine'
        when 23 then 'Walking Warm-Up'
        when 24 then 'Dynamic Warm-Up'
        when 25 then 'Elliptical'
      end as exercise_name
    from public.workout_sessions workout_session
    cross join lateral jsonb_array_elements_text(workout_session.exercise_ids) item(value)
    where workout_session.id = target_session_id
  )
  select distinct on (member.user_id, session_exercises.exercise_id)
    member.user_id,
    session_exercises.exercise_id,
    history.sets,
    history.saved_at
  from public.workout_session_participants member
  cross join session_exercises
  join public.workout_history history
    on history.user_id = member.user_id
   and history.exercise_name = session_exercises.exercise_name
  where member.session_id = target_session_id
    and member.status = 'accepted'
    and public.is_accepted_workout_session_participant(target_session_id)
  order by member.user_id, session_exercises.exercise_id, history.saved_at desc;
$$;
