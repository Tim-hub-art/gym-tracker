function ExerciseCard({
  workout,
  exercise,
  previous,
  current,
  updateCurrentExercise,
  saveExercise,
}) {
  return (
    <div className="card">
      <h3>{exercise}</h3>

      <div>
        <h4>Last Workout</h4>

        {previous.sets?.length ? (
          previous.sets.map((set, index) => (
            <p key={index}>
              Set {index + 1}: {set.weight} kg × {set.reps}
            </p>
          ))
        ) : (
          <p>No previous workout</p>
        )}
      </div>

      {current.sets.map((set, index) => (
        <div key={index}>
          <h4>Set {index + 1}</h4>

          <label>Weight (kg)</label>

          <input
            type="number"
            value={set.weight}
            onChange={(e) => {
              const newSets = [...current.sets];
              newSets[index].weight = e.target.value;

              updateCurrentExercise(workout, exercise, newSets);
            }}
          />

          <label>Reps</label>

          <input
            type="number"
            value={set.reps}
            onChange={(e) => {
              const newSets = [...current.sets];
              newSets[index].reps = e.target.value;

              updateCurrentExercise(workout, exercise, newSets);
            }}
          />

          <button
            onClick={() => {
              const newSets = current.sets.filter((_, i) => i !== index);

              updateCurrentExercise(
                workout,
                exercise,
                newSets.length
                  ? newSets
                  : [{ weight: "", reps: "" }]
              );
            }}
          >
            Remove Set
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          updateCurrentExercise(
            workout,
            exercise,
            [
              ...current.sets,
              {
                weight: "",
                reps: "",
              },
            ]
          )
        }
      >
        + Add Set
      </button>

      <button
        onClick={() => {
          saveExercise(workout, exercise, current.sets);

          updateCurrentExercise(
            workout,
            exercise,
            [{ weight: "", reps: "" }]
          );
        }}
      >
        Save
      </button>
    </div>
  );
}

export default ExerciseCard;
