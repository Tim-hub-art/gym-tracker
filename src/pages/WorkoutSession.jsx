import { useMemo, useState } from "react";
import { exerciseDatabase } from "../data/exerciseDatabase";
import { exerciseImages } from "../data/exerciseImages";

function emptySet(exercise) {
  return exercise.tracking === "cardio" ? { duration: "", distance: "" } : { weight: "", reps: "" };
}

function WorkoutSession({ session, participants, results, previousResults, personalRecords, saveSessionResult, finishSession, updateSessionExercises, canEditExercises, setCurrentScreen }) {
  const accepted = participants.filter((participant) => participant.status === "accepted");
  const [participantId, setParticipantId] = useState("");
  const exercises = useMemo(() => exerciseDatabase.filter((exercise) => session.exerciseIds.includes(exercise.id)), [session]);
  const [drafts, setDrafts] = useState({});
  const [collapsedExercises, setCollapsedExercises] = useState({});
  const [exerciseToAdd, setExerciseToAdd] = useState("");
  const activeParticipantId = accepted.some((participant) => participant.userId === participantId)
    ? participantId
    : accepted[0]?.userId || "";
  const isFinished = Boolean(session.completedAt);
  const savedResult = (userId, exerciseId) => results.find((result) => result.participantId === userId && result.exerciseId === exerciseId && result.sets?.length);
  const previousResult = (userId, exerciseId) => previousResults.find((result) => result.participantId === userId && result.exerciseId === exerciseId && result.sets?.length);
  const personalRecord = (userId, exerciseId) => personalRecords.find((record) => record.participantId === userId && record.exerciseId === exerciseId);
  const totalItems = accepted.length * exercises.length;
  const savedItems = accepted.reduce((total, participant) => total + exercises.filter((exercise) => savedResult(participant.userId, exercise.id)).length, 0);
  const readyToFinish = totalItems > 0 && savedItems === totalItems;

  function addExercise() {
    if (!exerciseToAdd) return;
    updateSessionExercises(session.id, [...session.exerciseIds, Number(exerciseToAdd)]);
    setExerciseToAdd("");
  }

  function removeExercise(exerciseId) {
    if (exercises.length === 1) {
      window.alert("A session needs at least one exercise.");
      return;
    }
    updateSessionExercises(session.id, session.exerciseIds.filter((id) => id !== exerciseId));
  }

  function getSets(exercise) {
    const draftKey = `${activeParticipantId}-${exercise.id}`;
    return drafts[draftKey] || savedResult(activeParticipantId, exercise.id)?.sets || [emptySet(exercise)];
  }

  function updateSets(exercise, nextSets) {
    const draftKey = `${activeParticipantId}-${exercise.id}`;
    setDrafts((current) => ({ ...current, [draftKey]: nextSets }));
  }

  function updateSet(exercise, index, field, value) {
    updateSets(exercise, getSets(exercise).map((set, setIndex) => setIndex === index ? { ...set, [field]: value } : set));
  }

  function copyPreviousSet(exercise, index) {
    const sets = getSets(exercise);
    const previous = previousResult(activeParticipantId, exercise.id)?.sets || [];
    const source = sets[index - 1] || previous[index] || previous.at(-1);
    if (!source) return;
    updateSets(exercise, sets.map((set, setIndex) => setIndex === index ? { ...set, ...source } : set));
  }

  function addWeight(exercise, index, amount) {
    const weight = Math.max(0, (Number(getSets(exercise)[index].weight) || 0) + amount);
    updateSet(exercise, index, "weight", String(weight));
  }

  function copyReps(exercise, index) {
    const sets = getSets(exercise);
    const previous = previousResult(activeParticipantId, exercise.id)?.sets || [];
    const source = sets[index - 1] || previous[index] || previous.at(-1);
    if (source?.reps !== undefined) updateSet(exercise, index, "reps", source.reps);
  }

  function removeSet(exercise, index) {
    const nextSets = getSets(exercise).filter((_, setIndex) => setIndex !== index);
    updateSets(exercise, nextSets.length ? nextSets : [emptySet(exercise)]);
  }

  function hasNewPersonalRecord(exercise, sets, record) {
    if (!record) return false;
    if (exercise.tracking === "cardio") {
      return sets.some((set) => Number(set.duration) > record.longestDuration || Number(set.distance) > record.longestDistance);
    }
    return sets.some((set) => {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      return weight > record.highestWeight || reps > record.mostReps || weight * (1 + reps / 30) > record.estimatedOneRepMax;
    });
  }

  async function saveAndCollapse(exercise) {
    const sets = getSets(exercise);
    const valid = sets.every((set) => exercise.tracking === "cardio"
      ? Number(set.duration) > 0
      : set.weight !== "" && Number(set.weight) >= 0 && Number(set.reps) > 0);
    if (!valid) {
      window.alert(exercise.tracking === "cardio"
        ? "Enter a duration for every activity before saving."
        : "Enter a weight and reps for every set before saving.");
      return;
    }
    const didSave = await saveSessionResult(session.id, activeParticipantId, exercise.id, sets);
    if (didSave) {
      setCollapsedExercises((current) => ({ ...current, [`${activeParticipantId}-${exercise.id}`]: true }));
    }
  }

  const activePerson = accepted.find((participant) => participant.userId === activeParticipantId);

  return (
    <main className="session-page">
      <button onClick={() => setCurrentScreen("friends")}>Back to Friends</button>
      <h2>{session.title}</h2>
      <p>{isFinished ? "This session is complete and saved to everyone’s history." : "Record each participant’s results, then finish the session together."}</p>

      <section className="card session-progress-card">
        <div className="session-progress-heading"><h3>Session progress</h3><strong>{savedItems}/{totalItems}</strong></div>
        <div className="progress-track" aria-label={`${savedItems} of ${totalItems} results saved`}><span style={{ width: `${totalItems ? (savedItems / totalItems) * 100 : 0}%` }} /></div>
        <div className="session-member-progress">
          {accepted.map((participant) => {
            const complete = exercises.filter((exercise) => savedResult(participant.userId, exercise.id)).length;
            const isReady = exercises.length > 0 && complete === exercises.length;
            return <div key={participant.userId}><span>{isReady ? "✓" : "○"}</span><div>{participant.name || participant.email}<small>{complete}/{exercises.length} exercises</small></div><strong className={`session-ready-status ${isReady ? "ready" : ""}`}>{isReady ? "Ready" : "In progress"}</strong></div>;
          })}
        </div>
      </section>

      {!isFinished && canEditExercises && <section className="card session-exercise-controls">
        <h3>Session exercises</h3>
        <p>Add an exercise for everyone, or remove one before finishing the session.</p>
        <div className="inline-form">
          <select value={exerciseToAdd} onChange={(event) => setExerciseToAdd(event.target.value)} aria-label="Exercise to add">
            <option value="">Choose an exercise</option>
            {exerciseDatabase.filter((exercise) => !session.exerciseIds.includes(exercise.id)).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
          </select>
          <button onClick={addExercise} disabled={!exerciseToAdd}>Add Exercise</button>
        </div>
      </section>}

      {!isFinished && <div className="participant-tabs" role="tablist">
        {accepted.map((participant) => <button key={participant.userId} className={participant.userId === activeParticipantId ? "active" : ""} onClick={() => setParticipantId(participant.userId)}>{participant.name || participant.email}</button>)}
      </div>}
      {!isFinished && activePerson && <p className="session-person">Recording for <strong>{activePerson.name || activePerson.email}</strong></p>}

      {exercises.map((exercise) => {
        const sets = getSets(exercise);
        const cardio = exercise.tracking === "cardio";
        const previous = previousResult(activeParticipantId, exercise.id);
        const record = personalRecord(activeParticipantId, exercise.id);
        const collapseKey = `${activeParticipantId}-${exercise.id}`;
        const isCollapsed = !isFinished && Boolean(collapsedExercises[collapseKey]);
        return <section className="card session-exercise" key={exercise.id}>
          {isCollapsed ? <div className="collapsed-session-exercise"><div><h3>{exercise.name}</h3><p>Saved for {activePerson?.name || "participant"}</p></div><div className="collapsed-exercise-actions"><div className="exercise-member-status" aria-label={`Completion for ${exercise.name}`}>{accepted.map((participant) => <span key={participant.userId} title={`${participant.name || participant.email}: ${savedResult(participant.userId, exercise.id) ? "saved" : "not saved"}`}>{savedResult(participant.userId, exercise.id) ? "✓" : "○"}</span>)}</div><button onClick={() => setCollapsedExercises((current) => ({ ...current, [collapseKey]: false }))}>Unfold / Edit</button></div></div> : <>
          <div className="exercise-session-heading"><div className="session-exercise-identity">{exerciseImages[exercise.id] && <img className="session-machine-thumbnail" src={exerciseImages[exercise.id]} alt="" />}<div><h3>{exercise.name}</h3><p>Machine {exercise.machine ?? "N/A"}</p></div></div><div className="exercise-member-status" aria-label={`Completion for ${exercise.name}`}>{accepted.map((participant) => <span key={participant.userId} title={`${participant.name || participant.email}: ${savedResult(participant.userId, exercise.id) ? "saved" : "not saved"}`}>{savedResult(participant.userId, exercise.id) ? "✓" : "○"}</span>)}</div></div>
          {!isFinished && canEditExercises && <button className="remove-session-exercise" onClick={() => removeExercise(exercise.id)}>Remove Exercise</button>}
          {!isFinished && <>
            <div className="session-previous-result">
              <strong>Previous workout</strong>
              {previous ? <div className="session-previous-sets">{previous.sets.map((set, index) => <span key={index}>{cardio ? `${set.duration || 0} min · ${set.distance || 0} km` : `${set.weight || 0} kg × ${set.reps || 0}`} </span>)}</div> : <span>No previous result for {activePerson?.name || "this person"}.</span>}
            </div>
            {record && <div className="personal-record-card session-personal-record">
              <h4>Personal Records</h4>
              {cardio
                ? <p>Longest duration: {record.longestDuration} min · Longest distance: {record.longestDistance} km</p>
                : <p>Highest weight: {record.highestWeight} kg · Most reps: {record.mostReps} · Estimated 1RM: {Math.round(record.estimatedOneRepMax)} kg</p>}
            </div>}
            {hasNewPersonalRecord(exercise, sets, record) && <p className="session-record-highlight">🏆 This entry beats a previous personal record.</p>}
            {sets.map((set, index) => <div className="set-editor" key={index}>
              <h4>{cardio ? "Activity" : `Set ${index + 1}`}</h4>
              {cardio ? <><input type="number" min="0" placeholder="Minutes" value={set.duration} onChange={(event) => updateSet(exercise, index, "duration", event.target.value)} /><input type="number" min="0" placeholder="Distance (km)" value={set.distance} onChange={(event) => updateSet(exercise, index, "distance", event.target.value)} /></> : <><input type="number" min="0" placeholder="Weight (kg)" value={set.weight} onChange={(event) => updateSet(exercise, index, "weight", event.target.value)} /><input type="number" min="0" placeholder="Reps" value={set.reps} onChange={(event) => updateSet(exercise, index, "reps", event.target.value)} /><div className="quick-set-actions" aria-label={`Quick actions for set ${index + 1}`}><button type="button" onClick={() => copyPreviousSet(exercise, index)}>Repeat last set</button><button type="button" onClick={() => addWeight(exercise, index, 2.5)}>+2.5 kg</button><button type="button" onClick={() => copyReps(exercise, index)}>Same reps</button></div></>}
              <button type="button" onClick={() => removeSet(exercise, index)}>Remove {cardio ? "Activity" : "Set"}</button>
            </div>)}
            <button onClick={() => updateSets(exercise, [...sets, emptySet(exercise)])}>+ Add {cardio ? "Activity" : "Set"}</button>
            <button className="save-button" onClick={() => saveAndCollapse(exercise)}>Save {activePerson?.name || "results"}</button>
          </>}
          </>}
        </section>;
      })}

      {!isFinished && <button className="finish-workout-button finish-session-button" onClick={() => finishSession(session)} disabled={!readyToFinish}>Finish Session & Save History</button>}
      {!isFinished && !readyToFinish && <p className="form-help">Save every exercise for every accepted participant to finish the session.</p>}
    </main>
  );
}

export default WorkoutSession;
