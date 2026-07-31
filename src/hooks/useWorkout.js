export function useWorkout(
  todaysWorkout,
  setTodaysWorkout
) {
  function removeExerciseFromWorkout(id) {
    const newWorkout = todaysWorkout.filter(
      (exercise) => exercise.id !== id
    );

    setTodaysWorkout(newWorkout);

    localStorage.setItem(
      "todaysWorkout",
      JSON.stringify(newWorkout)
    );
  }

  return {
    removeExerciseFromWorkout,
  };
}