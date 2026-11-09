import { exerciseDatabase } from "../data/exerciseDatabase";

function ExerciseSelection({
  selectedMuscleGroup,
  selectedCableAttachment,
  addExerciseToWorkout,
  openExercise,
}) {
  const filteredExercises =
    selectedMuscleGroup === "All Workouts"
      ? exerciseDatabase
      : selectedMuscleGroup === "Cable Tower"
        ? exerciseDatabase.filter((exercise) => exercise.attachment === selectedCableAttachment)
      : exerciseDatabase.filter(
          (exercise) => exercise.muscleGroup === selectedMuscleGroup
        );

  return (
    <div>
      <h2>{selectedMuscleGroup === "Cable Tower" ? "Cable Tower" : selectedMuscleGroup}</h2>
      {selectedMuscleGroup === "Cable Tower" && <p>Choose an exercise for the selected attachment.</p>}

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
