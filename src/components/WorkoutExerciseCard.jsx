import { exerciseImages } from "../data/exerciseImages";

function WorkoutExerciseCard({
  exercise,
  openExercise,
  removeExerciseFromWorkout,
  moveExercise,
  isFirst,
  isLast,
}) {
  return (
    <article className={`workout-card ${exercise.completed ? "completed" : ""}`}>
      <div className="workout-card-main">
        <span className="workout-status" aria-hidden="true">
          {exercise.completed ? "✓" : ""}
        </span>
        {exerciseImages[exercise.id] && (
          <img
            className="machine-thumbnail"
            src={exerciseImages[exercise.id]}
            alt=""
          />
        )}
        <div>
          <h3 className="workout-title">{exercise.name}</h3>
          <p className="machine-number">Machine {exercise.machine ?? "N/A"}</p>
          {exercise.completed && <p className="completed-label">Completed</p>}
        </div>
      </div>

      <div className="workout-buttons">
        <button onClick={() => moveExercise(exercise.id, -1)} disabled={isFirst} aria-label={`Move ${exercise.name} up`}>↑</button>
        <button onClick={() => moveExercise(exercise.id, 1)} disabled={isLast} aria-label={`Move ${exercise.name} down`}>↓</button>
        <button className="open-exercise-button" onClick={() => openExercise(exercise)}>
          {exercise.completed ? "Edit" : "Start"}
        </button>
        <button className="remove-exercise-button" onClick={() => removeExerciseFromWorkout(exercise.id)}>Remove</button>
      </div>
    </article>
  );
}

export default WorkoutExerciseCard;
