# Gym Tracker Patch Update — 2026-08-19

## Status

The latest changes below are prepared locally and have **not** been committed or pushed to GitHub/Vercel. Earlier updates were already deployed during previous work.

## Earlier app and account work

- Built out the Gym Tracker React/Vite app and connected it to Supabase for cloud-synced workout data.
- Set up sign-in and account creation with account display names, profile-name changes, sign out, and a compact settings menu.
- Deployed the app through GitHub and Vercel, with Supabase configured for the live site.
- Improved the mobile layout, title visibility, theme handling, and settings-menu behaviour.
- Added appearance presets: Lime, Ocean, Berry, and Light.

## Workout tracking and progress

- Added workout templates, custom templates, exercise reordering, notes per exercise, and personal records.
- Added a dashboard with exercise switching and progress charts.
- Added body-weight tracking, including editing and deleting entries.
- Added cardio and warm-up activities.
- Added workout history grouped by date, deletion of history entries, and the ability to log a workout completed in the past.

## Exercise images and exercise library

- Added individual machine thumbnails for the exercise library and used them in normal workouts, shared sessions, and the reps/weight entry screen.
- Replaced the Tricep Extension thumbnail with a design closer to the seated Basic-Fit machine.
- Renamed **Hammer Curl** to **Tricep Extension** and moved it from Biceps to Triceps. Existing history keeps its original exercise name and is not deleted or changed.

## Shared workout sessions

- Added a Friends & Sessions area in Settings, including friend requests, accepting/declining requests, session invitations, and joining a shared workout.
- Added shared-session exercise management: the host can add or remove exercises, participants can record results for each person, and the session shows individual completion progress.
- Added a **Previous workout** area for the selected person and exercise. It shows that person's latest saved result before new sets are entered.
- Added secure Supabase support so only accepted participants in that specific session can access these previous results.
- After saving an exercise for a person, its card now folds into a compact row with the exercise name, completion circles, and an **Unfold / Edit** button.
- Finishing a shared session now saves every participant's history and automatically closes the session for all accepted and pending members. The finished shared session disappears from Friends & Sessions.

## Sign-in behaviour

- When Supabase reports an expired or invalid JWT, the app now clears the expired session and returns to the sign-in page with a message asking the user to sign in again.

## Supabase updates already run successfully

- Added the secure `get_workout_session_previous_results` function for previous results in shared sessions.
- Updated `finish_workout_session` so it marks all session members as left after the session is saved.
- An earlier SQL attempt had a syntax error and made no changes. The clean rerun succeeded.

## Verification

- `npm run build` passes.
- `npm run lint` has one existing React Hook dependency warning in `src/App.jsx`; there are no lint errors.
