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
  hasSelectedTemplate,
  addTemplateToWorkout,
  saveCustomTemplate,
  removeCustomTemplate,
  moveExercise,
}) {
  const [templateName, setTemplateName] = useState("");
  const completedCount = todaysWorkout.filter((exercise) => exercise.completed).length;
  const progress = todaysWorkout.length
    ? Math.round((completedCount / todaysWorkout.length) * 100)
    : 0;
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  function saveTemplate() {
    if (saveCustomTemplate(templateName)) setTemplateName("");
  }

  return (
    <main className="workout-page">
      <section className="workout-overview">
        <div className="workout-overview-heading">
          <div>
            <p className="eyebrow">{today}</p>
            <h2>Today's Workout</h2>
          </div>
          <span className="progress-badge">{progress}%</span>
        </div>

        <div className="workout-stats">
          <div><strong>{todaysWorkout.length}</strong><span>Exercises</span></div>
          <div><strong>{completedCount}</strong><span>Complete</span></div>
          <div><strong>{Math.max(todaysWorkout.length - completedCount, 0)}</strong><span>To go</span></div>
        </div>

        <div className="progress-track" aria-label={`${progress}% workout complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      {todaysWorkout.length === 0 && (
        <p className="empty-workout-message">Start with a template or build your own workout.</p>
      )}

      <section className="exercise-list" aria-label="Exercises in today’s workout">
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
      </section>

      {!hasSelectedTemplate && (
        <section className="template-section">
          <h3>Workout Templates</h3>
          <div className="template-buttons">
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
          </div>
        </section>
      )}

      {todaysWorkout.length > 0 && (
        <section className="template-section compact-template-section">
          <h3>Save as a Template</h3>
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

      <button className="add-exercise-button" onClick={() => setCurrentScreen("muscleGroups")}>
        <span aria-hidden="true">+</span> Add Exercise
      </button>

      {todaysWorkout.length > 0 && (
        <div className="workout-actions">
          <button className="finish-workout-button" onClick={finishWorkout}>Finish Workout</button>
          <button className="reset-workout-button" onClick={resetWorkout}>Reset</button>
        </div>
      )}
    </main>
  );
}

export default TodaysWorkout;
