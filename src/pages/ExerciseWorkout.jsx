import { useState } from "react";
import ExerciseCard from "../components/ExerciseCard";
import { getExerciseGuidance } from "../data/exerciseGuidance";
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

function createEmptySet(exercise) {
  return exercise.tracking === "cardio"
    ? { duration: "", distance: "" }
    : { weight: "", reps: "" };
}

function ExerciseWorkout({
  selectedExercise,
  selectedUser,
  savedData,
  currentData,
  updateCurrentExercise,
  saveExercise,
  completeExercise,
  setCurrentScreen,
  note,
  saveExerciseNote,
  personalRecord,
}) {
  const [noteText, setNoteText] = useState(note);
  const workout = "Today's Workout";
  const previous = savedData[selectedUser]?.[workout]?.[selectedExercise.name] || { sets: [] };
  const current = currentData[selectedUser]?.[workout]?.[selectedExercise.name] || {
    sets: previous.sets.length ? previous.sets.map((set) => ({ ...set })) : [createEmptySet(selectedExercise)],
  };
  const isCardio = selectedExercise.tracking === "cardio";

  return (
    <div>
      <button onClick={() => setCurrentScreen("todaysWorkout")}>Back to Workout</button>
      <div className="exercise-workout-heading">
        {machineImages[selectedExercise.muscleGroup] && <img className="exercise-workout-image" src={machineImages[selectedExercise.muscleGroup]} alt="" />}
        <div><h2>{selectedExercise.name}</h2><p>Machine: {selectedExercise.machine ?? "N/A"}</p></div>
      </div>

      <details className="exercise-details">
        <summary>Exercise Details & Tips</summary>
        <p>{getExerciseGuidance(selectedExercise)}</p>
      </details>

      {personalRecord && (
        <div className="personal-record-card">
          <h3>Personal Records</h3>
          {isCardio ? (
            <p>Longest duration: {personalRecord.longestDuration || 0} min · Longest distance: {personalRecord.longestDistance || 0} km</p>
          ) : (
            <p>Highest weight: {personalRecord.highestWeight || 0} kg · Most reps: {personalRecord.mostReps || 0} · Best set volume: {personalRecord.bestSetVolume || 0} kg</p>
          )}
        </div>
      )}

      <div className="card exercise-notes">
        <label htmlFor="exercise-note">Notes for this exercise</label>
        <textarea
          id="exercise-note"
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Example: Seat position 4. Try 5 kg more next time."
        />
        <button className="save-button" onClick={() => saveExerciseNote(selectedExercise.name, noteText)}>
          Save Note
        </button>
      </div>

      <ExerciseCard
        workout={workout}
        exercise={selectedExercise}
        previous={previous}
        current={current}
        updateCurrentExercise={updateCurrentExercise}
        saveExercise={saveExercise}
        completeExercise={completeExercise}
        onSaveComplete={() => setCurrentScreen("todaysWorkout")}
      />
    </div>
  );
}

export default ExerciseWorkout;
