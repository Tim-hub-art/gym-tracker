function createEmptySet(exercise) {
  return exercise.tracking === "cardio"
    ? { duration: "", distance: "" }
    : { weight: "", reps: "" };
}

function ExerciseCard({
  workout,
  exercise,
  previous,
  current,
  updateCurrentExercise,
  saveExercise,
  completeExercise,
  onSaveComplete,
}) {
  const isCardio = exercise.tracking === "cardio";

  function updateSet(index, field, value) {
    const newSets = current.sets.map((set, setIndex) =>
      setIndex === index ? { ...set, [field]: value } : set
    );
    updateCurrentExercise(workout, exercise.name, newSets);
  }

  function copyPreviousSet(index) {
    const source = current.sets[index - 1] || previous.sets?.[index] || previous.sets?.at(-1);
    if (!source) return;
    updateCurrentExercise(
      workout,
      exercise.name,
      current.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...source } : set))
    );
  }

  function addWeight(index, amount) {
    const nextWeight = Math.max(0, (Number(current.sets[index].weight) || 0) + amount);
    updateSet(index, "weight", String(nextWeight));
  }

  function copyReps(index) {
    const source = current.sets[index - 1] || previous.sets?.[index] || previous.sets?.at(-1);
    if (source?.reps !== undefined) updateSet(index, "reps", source.reps);
  }

  return (
    <div className="card">
      <h3>{exercise.name}</h3>

      <div>
        <h4>Last Workout</h4>
        {previous.sets?.length ? (
          previous.sets.map((set, index) => (
            <p key={index}>
              Set {index + 1}: {isCardio
                ? `${set.duration} min${set.distance ? ` · ${set.distance} km` : ""}`
                : `${set.weight} kg × ${set.reps}`}
            </p>
          ))
        ) : (
          <p>No previous workout</p>
        )}
      </div>

      {current.sets.map((set, index) => (
        <div className="set-editor" key={index}>
          <h4>{isCardio ? "Activity" : `Set ${index + 1}`}</h4>

          {isCardio ? (
            <>
              <label htmlFor={`duration-${index}`}>Duration (minutes)</label>
              <input
                id={`duration-${index}`}
                type="number"
                min="0"
                value={set.duration}
                onChange={(e) => updateSet(index, "duration", e.target.value)}
              />
              <label htmlFor={`distance-${index}`}>Distance (km, optional)</label>
              <input
                id={`distance-${index}`}
                type="number"
                min="0"
                step="0.01"
                value={set.distance}
                onChange={(e) => updateSet(index, "distance", e.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor={`weight-${index}`}>Weight (kg)</label>
              <input
                id={`weight-${index}`}
                type="number"
                min="0"
                value={set.weight}
                onChange={(e) => updateSet(index, "weight", e.target.value)}
              />
              <label htmlFor={`reps-${index}`}>Reps</label>
              <input
                id={`reps-${index}`}
                type="number"
                min="0"
                value={set.reps}
                onChange={(e) => updateSet(index, "reps", e.target.value)}
              />
              <div className="quick-set-actions" aria-label={`Quick actions for set ${index + 1}`}>
                <button type="button" onClick={() => copyPreviousSet(index)}>Repeat last set</button>
                <button type="button" onClick={() => addWeight(index, 2.5)}>+2.5 kg</button>
                <button type="button" onClick={() => copyReps(index)}>Same reps</button>
              </div>
            </>
          )}

          <button
            onClick={() => {
              const newSets = current.sets.filter((_, setIndex) => setIndex !== index);
              updateCurrentExercise(
                workout,
                exercise.name,
                newSets.length ? newSets : [createEmptySet(exercise)]
              );
            }}
          >
            Remove {isCardio ? "Activity" : "Set"}
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          updateCurrentExercise(workout, exercise.name, [
            ...current.sets,
            createEmptySet(exercise),
          ])
        }
      >
        + Add {isCardio ? "Activity" : "Set"}
      </button>

      <button
        className="save-button"
        onClick={() => {
          const hasValidEntries = current.sets.every((set) =>
            isCardio
              ? Number(set.duration) > 0
              : set.weight !== "" && Number(set.weight) >= 0 && Number(set.reps) > 0
          );

          if (!hasValidEntries) {
            window.alert(
              isCardio
                ? "Enter a duration for every activity before saving."
                : "Enter a weight and reps for every set before saving."
            );
            return;
          }

          saveExercise(workout, exercise, current.sets);
          completeExercise(exercise.id);
          onSaveComplete();
        }}
      >
        Save Exercise
      </button>
    </div>
  );
}

export default ExerciseCard;
