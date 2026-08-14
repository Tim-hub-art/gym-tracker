import backMachine from "../assets/machines/back.png";
import coreMachine from "../assets/machines/core.png";
import legsMachine from "../assets/machines/legs.png";
import shouldersMachine from "../assets/machines/shoulders.png";
import tricepsMachine from "../assets/machines/triceps.png";

const machineImages = {
  Legs: legsMachine,
  Back: backMachine,
  Shoulders: shouldersMachine,
  Core: coreMachine,
  Triceps: tricepsMachine,
};

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
        {machineImages[exercise.muscleGroup] && (
          <img
            className="machine-thumbnail"
            src={machineImages[exercise.muscleGroup]}
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
