import { exerciseDatabase } from "../data/exerciseDatabase";

function ExerciseSelection({
  selectedMuscleGroup,
  addExerciseToWorkout,
  openExercise,
}) {
  const filteredExercises =
    selectedMuscleGroup === "All Workouts"
      ? exerciseDatabase
      : exerciseDatabase.filter(
          (exercise) => exercise.muscleGroup === selectedMuscleGroup
        );

  return (
    <div>
      <h2>{selectedMuscleGroup}</h2>

      {filteredExercises.map((exercise) => (
        <button
          key={exercise.id}
         onClick={() => {
         addExerciseToWorkout(exercise);
          openExercise(exercise);
}}
        >
            {exercise.name}
        </button>
      ))}
    </div>
  );
}

export default ExerciseSelection;
