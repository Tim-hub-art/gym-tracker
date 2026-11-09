-- Shared-session personal records
-- Run this once in Supabase SQL Editor after reviewing it.
-- It only adds a read-only function. No workout or user data is changed.

create or replace function public.get_workout_session_personal_records(target_session_id uuid)
returns table (
  participant_id uuid,
  exercise_id integer,
  highest_weight numeric,
  most_reps integer,
  estimated_one_rep_max numeric,
  best_set_volume numeric,
  longest_duration numeric,
  longest_distance numeric
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
        when 1 then 'Leg Press' when 2 then 'Leg Extension' when 3 then 'Prone Leg Curl'
        when 4 then 'Seated Leg Curl' when 5 then 'Calf Press' when 6 then 'Hip Abduction'
        when 7 then 'Hip Adduction' when 8 then 'Lat Pull' when 9 then 'Seated Row'
        when 10 then 'Back Extension' when 11 then 'Shoulder Press' when 12 then 'Abdominal Crunch'
        when 13 then 'Seated Dip' when 14 then 'Dip / Chin Assist' when 15 then 'Chest Press'
        when 16 then 'Pec Deck' when 17 then 'Cable Crossover' when 18 then 'Bicep Curl'
        when 19 then 'Tricep Extension' when 20 then 'Treadmill' when 21 then 'Exercise Bike'
        when 22 then 'Rowing Machine' when 23 then 'Walking Warm-Up' when 24 then 'Dynamic Warm-Up'
        when 25 then 'Elliptical'
      end as exercise_name
    from public.workout_sessions workout_session
    cross join lateral jsonb_array_elements_text(workout_session.exercise_ids) item(value)
    where workout_session.id = target_session_id
  )
  select
    member.user_id as participant_id,
    session_exercises.exercise_id,
    coalesce(max(nullif(set_item.value ->> 'weight', '')::numeric), 0) as highest_weight,
    coalesce(max(nullif(set_item.value ->> 'reps', '')::integer), 0) as most_reps,
    coalesce(max(
      nullif(set_item.value ->> 'weight', '')::numeric *
      (1 + nullif(set_item.value ->> 'reps', '')::numeric / 30)
    ), 0) as estimated_one_rep_max,
    coalesce(max(
      nullif(set_item.value ->> 'weight', '')::numeric *
      nullif(set_item.value ->> 'reps', '')::numeric
    ), 0) as best_set_volume,
    coalesce(max(nullif(set_item.value ->> 'duration', '')::numeric), 0) as longest_duration,
    coalesce(max(nullif(set_item.value ->> 'distance', '')::numeric), 0) as longest_distance
  from public.workout_session_participants member
  cross join session_exercises
  join public.workout_history history
    on history.user_id = member.user_id
   and history.exercise_name = session_exercises.exercise_name
  cross join lateral jsonb_array_elements(history.sets) set_item(value)
  where member.session_id = target_session_id
    and member.status = 'accepted'
    and public.is_accepted_workout_session_participant(target_session_id)
  group by member.user_id, session_exercises.exercise_id;
$$;

revoke all on function public.get_workout_session_personal_records(uuid) from public;
revoke all on function public.get_workout_session_personal_records(uuid) from anon;
grant execute on function public.get_workout_session_personal_records(uuid) to authenticated;
