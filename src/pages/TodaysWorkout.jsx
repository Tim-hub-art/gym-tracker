import { useState } from "react";
import WorkoutExerciseCard from "../components/WorkoutExerciseCard";

function TodaysWorkout({
  todaysWorkout,
  openExercise,
  removeExerciseFromWorkout,
  setCurrentScreen,
  finishWorkout,
  resetWorkout,
  workoutTemplates,
  addTemplateToWorkout,
  saveCustomTemplate,
  removeCustomTemplate,
  moveExercise,
}) {
  const [templateName, setTemplateName] = useState("");

  function saveTemplate() {
    if (saveCustomTemplate(templateName)) setTemplateName("");
  }

  return (
    <div>
      <h2>Today's Workout</h2>
      {todaysWorkout.length === 0 && <p>Choose a template or add an exercise to begin.</p>}

      {todaysWorkout.map((exercise, index) => (
        <WorkoutExerciseCard
          key={exercise.id}
          exercise={exercise}
          openExercise={openExercise}
          removeExerciseFromWorkout={removeExerciseFromWorkout}
          moveExercise={moveExercise}
          isFirst={index === 0}
          isLast={index === todaysWorkout.length - 1}
        />
      ))}

      <section className="template-section">
        <h3>Workout Templates</h3>
        {workoutTemplates.map((template) => (
          <div className="template-row" key={template.id}>
            <button onClick={() => addTemplateToWorkout(template)}>+ {template.name}</button>
            {template.custom && (
              <button className="delete-history-button" onClick={() => removeCustomTemplate(template.id)}>
                Delete
              </button>
            )}
          </div>
        ))}
      </section>

      {todaysWorkout.length > 0 && (
        <section className="template-section">
          <h3>Save This as a Template</h3>
          <label htmlFor="template-name">Template name</label>
          <input
            id="template-name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="e.g. Saturday Workout"
          />
          <button onClick={saveTemplate}>Save Template</button>
        </section>
      )}

      <button onClick={() => setCurrentScreen("muscleGroups")}>+ Add Exercise</button>

      {todaysWorkout.length > 0 && (
        <div className="workout-actions">
          <button className="finish-workout-button" onClick={finishWorkout}>Finish Today's Workout</button>
          <button className="reset-workout-button" onClick={resetWorkout}>Reset Workout</button>
        </div>
      )}
    </div>
  );
}

export default TodaysWorkout;
