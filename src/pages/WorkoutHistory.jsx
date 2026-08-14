import { useState } from "react";
import { exerciseDatabase } from "../data/exerciseDatabase";

function emptySet(exercise) {
  return exercise.tracking === "cardio" ? { duration: "", distance: "" } : { weight: "", reps: "" };
}

function formatSet(set) {
  if (set.duration !== undefined) return `${set.duration} min${set.distance ? ` · ${set.distance} km` : ""}`;
  return `${set.weight} kg × ${set.reps}`;
}

function WorkoutHistory({ selectedUser, workoutHistory, removeHistoryEntry, savePastWorkout, setCurrentScreen }) {
  const [openDates, setOpenDates] = useState([]);
  const [isAddingPastWorkout, setIsAddingPastWorkout] = useState(false);
  const [exerciseId, setExerciseId] = useState(String(exerciseDatabase[0]?.id || ""));
  const [recordedOn, setRecordedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const selectedExercise = exerciseDatabase.find((exercise) => String(exercise.id) === exerciseId) || exerciseDatabase[0];
  const [sets, setSets] = useState(() => [emptySet(exerciseDatabase[0])]);
  const isCardio = selectedExercise?.tracking === "cardio";

  const dateGroups = workoutHistory
    .filter((entry) => entry.user === selectedUser)
    .reduce((groups, entry) => {
      const date = new Date(entry.savedAt);
      const dateKey = date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      if (!groups[dateKey]) groups[dateKey] = { timestamp: date.getTime(), entries: [] };
      groups[dateKey].entries.push(entry);
      return groups;
    }, {});
  const orderedGroups = Object.entries(dateGroups).sort(([, first], [, second]) => second.timestamp - first.timestamp);

  function toggleDate(dateKey) {
    setOpenDates((currentDates) => currentDates.includes(dateKey) ? currentDates.filter((date) => date !== dateKey) : [...currentDates, dateKey]);
  }

  function changeExercise(nextId) {
    const nextExercise = exerciseDatabase.find((exercise) => String(exercise.id) === nextId);
    setExerciseId(nextId);
    setSets([emptySet(nextExercise)]);
  }

  function updateSet(index, field, value) {
    setSets((current) => current.map((set, setIndex) => setIndex === index ? { ...set, [field]: value } : set));
  }

  function submitPastWorkout(event) {
    event.preventDefault();
    const valid = sets.every((set) => isCardio ? Number(set.duration) > 0 : set.weight !== "" && Number(set.weight) >= 0 && Number(set.reps) > 0);
    if (!valid) {
      window.alert(isCardio ? "Enter a duration for every activity." : "Enter a weight and reps for every set.");
      return;
    }
    savePastWorkout(selectedExercise, sets, recordedOn);
    setSets([emptySet(selectedExercise)]);
    setIsAddingPastWorkout(false);
  }

  return (
    <div>
      <button onClick={() => setCurrentScreen("todaysWorkout")}>Back</button>
      <h2>{selectedUser}'s Exercise History</h2>
      <button className="save-button" onClick={() => setIsAddingPastWorkout((open) => !open)}>{isAddingPastWorkout ? "Cancel" : "+ Log Past Workout"}</button>

      {isAddingPastWorkout && <section className="card past-workout-form">
        <h3>Log a past workout</h3>
        <p>Choose the date the workout was actually completed.</p>
        <form onSubmit={submitPastWorkout}>
          <label htmlFor="past-workout-date">Workout date</label>
          <input id="past-workout-date" type="date" value={recordedOn} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setRecordedOn(event.target.value)} required />
          <label htmlFor="past-workout-exercise">Exercise</label>
          <select id="past-workout-exercise" value={exerciseId} onChange={(event) => changeExercise(event.target.value)}>{exerciseDatabase.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select>
          {sets.map((set, index) => <div className="set-editor" key={index}>
            <h4>{isCardio ? "Activity" : `Set ${index + 1}`}</h4>
            {isCardio ? <><input type="number" min="0" placeholder="Minutes" value={set.duration} onChange={(event) => updateSet(index, "duration", event.target.value)} /><input type="number" min="0" placeholder="Distance (km)" value={set.distance} onChange={(event) => updateSet(index, "distance", event.target.value)} /></> : <><input type="number" min="0" placeholder="Weight (kg)" value={set.weight} onChange={(event) => updateSet(index, "weight", event.target.value)} /><input type="number" min="0" placeholder="Reps" value={set.reps} onChange={(event) => updateSet(index, "reps", event.target.value)} /></>}
          </div>)}
          <button type="button" onClick={() => setSets((current) => [...current, emptySet(selectedExercise)])}>+ Add {isCardio ? "Activity" : "Set"}</button>
          <button className="save-button" type="submit">Save Past Workout</button>
        </form>
      </section>}

      {orderedGroups.length === 0 ? <p>No saved exercises yet.</p> : orderedGroups.map(([dateKey, group]) => {
        const isOpen = openDates.includes(dateKey);
        return <section className="history-date-group" key={dateKey}>
          <button className="history-date-button" onClick={() => toggleDate(dateKey)} aria-expanded={isOpen}>{isOpen ? "▼" : "▶"} {dateKey} ({group.entries.length} workout{group.entries.length === 1 ? "" : "s"})</button>
          {isOpen && group.entries.map((entry) => <div className="history-card" key={entry.id}>
            <div className="history-card-heading"><div><h3>{entry.exercise}</h3><p className="history-date">{new Date(entry.savedAt).toLocaleTimeString()}</p></div><button className="delete-history-button" onClick={() => removeHistoryEntry(entry.id)}>Delete</button></div>
            {entry.sets.map((set, index) => <p key={index}>Set {index + 1}: {formatSet(set)}</p>)}
          </div>)}
        </section>;
      })}
    </div>
  );
}

export default WorkoutHistory;
