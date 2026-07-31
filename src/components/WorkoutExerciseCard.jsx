function WorkoutExerciseCard({
  exercise,
  openExercise,
  removeExerciseFromWorkout,
  moveExercise,
  isFirst,
  isLast,
}) {
  return (
<div className={`workout-card ${exercise.completed ? "completed" : ""}`}>

  <div>

    <h3 className="workout-title">
      {exercise.completed && "✅ "}
      {exercise.name}
    </h3>

    <p className="machine-number">
      Machine: {exercise.machine ?? "N/A"}
    </p>

    {exercise.completed && <p className="completed-label">Completed</p>}

  </div>

  <div className="workout-buttons">

    <button onClick={() => moveExercise(exercise.id, -1)} disabled={isFirst} aria-label={`Move ${exercise.name} up`}>
      ↑
    </button>

    <button onClick={() => moveExercise(exercise.id, 1)} disabled={isLast} aria-label={`Move ${exercise.name} down`}>
      ↓
    </button>


    <button
      onClick={() => openExercise(exercise)}
    >
      {exercise.completed ? "Edit" : "Open"}
    </button>

    <button
      onClick={() => removeExerciseFromWorkout(exercise.id)}
    >
      Remove
    </button>

  </div>

</div>
  );
}

export default WorkoutExerciseCard;
