import "./App.css";
import { useEffect, useState } from "react";
import { exerciseDatabase } from "./data/exerciseDatabase";
import { workoutTemplates } from "./data/workoutTemplates";
import TodaysWorkout from "./pages/TodaysWorkout";
import MuscleGroups from "./pages/MuscleGroups";
import ExerciseSelection from "./pages/ExerciseSelection";
import ExerciseWorkout from "./pages/ExerciseWorkout";
import WorkoutHistory from "./pages/WorkoutHistory";
import BodyWeight from "./pages/BodyWeight";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import { auth, db, isSupabaseConfigured } from "./lib/supabase";

const workoutName = "Today's Workout";

function createEmptySet(exercise) {
  return exercise.tracking === "cardio"
    ? { duration: "", distance: "" }
    : { weight: "", reps: "" };
}

function App() {
  const [session, setSession] = useState(() => auth.getSession());
  const [syncError, setSyncError] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("Legs");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("todaysWorkout");
  const [todaysWorkout, setTodaysWorkout] = useState(() => {
    const stored = localStorage.getItem("todaysWorkout");
    return stored ? JSON.parse(stored) : [];
  });
  const [savedData, setSavedData] = useState(() => {
    const stored = localStorage.getItem("gymTracker");
    return stored ? JSON.parse(stored) : {};
  });
  const [currentData, setCurrentData] = useState(() => {
    const stored = localStorage.getItem("gymTrackerCurrent");
    return stored ? JSON.parse(stored) : {};
  });
  const [workoutHistory, setWorkoutHistory] = useState(() => {
    const stored = localStorage.getItem("gymTrackerHistory");
    return stored ? JSON.parse(stored) : [];
  });
  const [bodyWeights, setBodyWeights] = useState(() => {
    const stored = localStorage.getItem("gymTrackerBodyWeights");
    return stored ? JSON.parse(stored) : [];
  });
  const [customTemplates, setCustomTemplates] = useState(() => {
    const stored = localStorage.getItem("gymTrackerCustomTemplates");
    return stored ? JSON.parse(stored) : [];
  });
  const [exerciseNotes, setExerciseNotes] = useState(() => {
    const stored = localStorage.getItem("gymTrackerExerciseNotes");
    return stored ? JSON.parse(stored) : {};
  });
  const [personalRecords, setPersonalRecords] = useState(() => {
    const stored = localStorage.getItem("gymTrackerPersonalRecords");
    return stored ? JSON.parse(stored) : {};
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("gymTrackerTheme") || "dark");
  const selectedUser = session?.user?.email || "Gym Member";

  async function loadCloudData() {
    try {
      const [historyRows, weightRows, noteRows, templateRows] = await Promise.all([
        db.select("workout_history", "&order=saved_at.desc"),
        db.select("body_weight_entries", "&order=recorded_on.desc"),
        db.select("exercise_notes"),
        db.select("custom_templates", "&order=created_at.desc"),
      ]);
      const history = historyRows.map((row) => ({
        id: row.id,
        user: session.user.email,
        exercise: row.exercise_name,
        sets: row.sets,
        savedAt: row.saved_at,
      }));
      const weights = weightRows.map((row) => ({
        id: row.id,
        user: session.user.email,
        weight: Number(row.weight),
        recordedOn: row.recorded_on,
      }));
      const notes = Object.fromEntries(noteRows.map((row) => [row.exercise_name, row.note]));
      const templates = templateRows.map((row) => ({
        id: row.id,
        name: row.name,
        exerciseIds: row.exercise_ids,
        custom: true,
      }));
      const latestExerciseData = {};
      history.forEach((entry) => {
        if (!latestExerciseData[entry.exercise]) latestExerciseData[entry.exercise] = { sets: entry.sets };
      });
      setWorkoutHistory(history);
      setBodyWeights(weights);
      setCustomTemplates(templates);
      setExerciseNotes({ [session.user.email]: notes });
      setSavedData({ [session.user.email]: { [workoutName]: latestExerciseData } });
    } catch (error) {
      setSyncError(`Could not load your cloud data: ${error.message}`);
    }
  }

  function syncErrorMessage(error) {
    setSyncError(`Could not save to Supabase: ${error.message}`);
  }

  useEffect(() => {
    if (!session?.user) return undefined;
    const loadTimer = window.setTimeout(() => {
      loadCloudData();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [session]);

  function saveExercise(workout, exercise, sets) {
    const exerciseName = exercise.name;
    const newData = {
      ...savedData,
      [selectedUser]: {
        ...savedData[selectedUser],
        [workout]: {
          ...savedData[selectedUser]?.[workout],
          [exerciseName]: { sets },
        },
      },
    };

    const newHistoryEntry = { id: crypto.randomUUID(), user: selectedUser, exercise: exerciseName, sets: sets.map((set) => ({ ...set })), savedAt: new Date().toISOString() };
    const newHistory = [newHistoryEntry, ...workoutHistory];

    setSavedData(newData);
    setWorkoutHistory(newHistory);
    localStorage.setItem("gymTracker", JSON.stringify(newData));
    localStorage.setItem("gymTrackerHistory", JSON.stringify(newHistory));
    updatePersonalRecords(exercise, sets);

    db.insert("workout_history", {
      user_id: session.user.id,
      exercise_name: exerciseName,
      sets: newHistoryEntry.sets,
    }).then(([row]) => {
      setWorkoutHistory((history) => history.map((entry) => entry.id === newHistoryEntry.id ? { ...entry, id: row.id, savedAt: row.saved_at } : entry));
    }).catch(syncErrorMessage);
  }

  function updatePersonalRecords(exercise, sets) {
    const previous = personalRecords[selectedUser]?.[exercise.name] || {};
    const isCardio = exercise.tracking === "cardio";
    const nextRecord = isCardio
      ? {
          longestDuration: Math.max(previous.longestDuration || 0, ...sets.map((set) => Number(set.duration) || 0)),
          longestDistance: Math.max(previous.longestDistance || 0, ...sets.map((set) => Number(set.distance) || 0)),
        }
      : {
          highestWeight: Math.max(previous.highestWeight || 0, ...sets.map((set) => Number(set.weight) || 0)),
          mostReps: Math.max(previous.mostReps || 0, ...sets.map((set) => Number(set.reps) || 0)),
          bestSetVolume: Math.max(
            previous.bestSetVolume || 0,
            ...sets.map((set) => (Number(set.weight) || 0) * (Number(set.reps) || 0))
          ),
        };
    const newRecords = {
      ...personalRecords,
      [selectedUser]: {
        ...personalRecords[selectedUser],
        [exercise.name]: nextRecord,
      },
    };

    setPersonalRecords(newRecords);
    localStorage.setItem("gymTrackerPersonalRecords", JSON.stringify(newRecords));
  }

  function updateCurrentExercise(workout, exercise, sets) {
    const newData = {
      ...currentData,
      [selectedUser]: {
        ...currentData[selectedUser],
        [workout]: {
          ...currentData[selectedUser]?.[workout],
          [exercise]: { sets },
        },
      },
    };

    setCurrentData(newData);
    localStorage.setItem("gymTrackerCurrent", JSON.stringify(newData));
  }

  function openExercise(exercise) {
    const existing = currentData[selectedUser]?.[workoutName]?.[exercise.name];

    if (!existing) {
      const previous = savedData[selectedUser]?.[workoutName]?.[exercise.name];
      const sets = previous?.sets?.length
        ? previous.sets.map((set) => ({ ...set }))
        : [createEmptySet(exercise)];

      updateCurrentExercise(workoutName, exercise.name, sets);
    }

    setSelectedExercise(exercise);
    setCurrentScreen("exerciseWorkout");
  }

  function addExerciseToWorkout(exercise) {
    const alreadyExists = todaysWorkout.some((item) => item.id === exercise.id);

    if (!alreadyExists) {
      const newWorkout = [...todaysWorkout, { ...exercise, completed: false }];
      setTodaysWorkout(newWorkout);
      localStorage.setItem("todaysWorkout", JSON.stringify(newWorkout));
    }

    setCurrentScreen("todaysWorkout");
  }

  function addTemplateToWorkout(template) {
    const templateExercises = exerciseDatabase.filter((exercise) =>
      template.exerciseIds.includes(exercise.id)
    );
    const existingIds = new Set(todaysWorkout.map((exercise) => exercise.id));
    const additions = templateExercises
      .filter((exercise) => !existingIds.has(exercise.id))
      .map((exercise) => ({ ...exercise, completed: false }));

    if (additions.length === 0) {
      window.alert("All exercises from this template are already in today's workout.");
      return;
    }

    const newWorkout = [...todaysWorkout, ...additions];
    setTodaysWorkout(newWorkout);
    localStorage.setItem("todaysWorkout", JSON.stringify(newWorkout));
  }

  function removeExerciseFromWorkout(id) {
    const newWorkout = todaysWorkout.filter((exercise) => exercise.id !== id);
    setTodaysWorkout(newWorkout);
    localStorage.setItem("todaysWorkout", JSON.stringify(newWorkout));
  }

  function moveExercise(id, direction) {
    const currentIndex = todaysWorkout.findIndex((exercise) => exercise.id === id);
    const newIndex = currentIndex + direction;
    if (currentIndex === -1 || newIndex < 0 || newIndex >= todaysWorkout.length) return;

    const newWorkout = [...todaysWorkout];
    [newWorkout[currentIndex], newWorkout[newIndex]] = [newWorkout[newIndex], newWorkout[currentIndex]];
    setTodaysWorkout(newWorkout);
    localStorage.setItem("todaysWorkout", JSON.stringify(newWorkout));
  }

  function completeExercise(id) {
    const newWorkout = todaysWorkout.map((exercise) =>
      exercise.id === id ? { ...exercise, completed: true } : exercise
    );
    setTodaysWorkout(newWorkout);
    localStorage.setItem("todaysWorkout", JSON.stringify(newWorkout));
  }

  function clearActiveWorkout() {
    const userCurrentData = { ...currentData[selectedUser] };
    delete userCurrentData[workoutName];
    const newCurrentData = { ...currentData, [selectedUser]: userCurrentData };

    setTodaysWorkout([]);
    setCurrentData(newCurrentData);
    localStorage.setItem("todaysWorkout", JSON.stringify([]));
    localStorage.setItem("gymTrackerCurrent", JSON.stringify(newCurrentData));
  }

  function finishWorkout() {
    if (todaysWorkout.length === 0) {
      window.alert("Add an exercise before finishing your workout.");
      return;
    }
    if (todaysWorkout.some((exercise) => !exercise.completed)) {
      window.alert("Save each exercise before finishing your workout.");
      return;
    }
    if (window.confirm("Finish this workout? Your saved results will be kept.")) {
      clearActiveWorkout();
      window.alert("Workout finished. Great work!");
    }
  }

  function resetWorkout() {
    if (
      todaysWorkout.length > 0 &&
      window.confirm("Reset today's workout? Unsaved entries will be removed.")
    ) {
      clearActiveWorkout();
    }
  }

  function addBodyWeight(weight, recordedOn) {
    const newWeight = {
      id: crypto.randomUUID(),
      user: selectedUser,
      weight: Number(weight),
      recordedOn,
    };
    const newWeights = [
      ...bodyWeights,
      newWeight,
    ];

    setBodyWeights(newWeights);
    localStorage.setItem("gymTrackerBodyWeights", JSON.stringify(newWeights));
    db.insert("body_weight_entries", { user_id: session.user.id, weight: newWeight.weight, recorded_on: recordedOn })
      .then(([row]) => setBodyWeights((weights) => weights.map((entry) => entry.id === newWeight.id ? { ...entry, id: row.id } : entry)))
      .catch(syncErrorMessage);
  }

  function updateBodyWeight(id, weight, recordedOn) {
    const newWeights = bodyWeights.map((entry) =>
      entry.id === id ? { ...entry, weight: Number(weight), recordedOn } : entry
    );
    setBodyWeights(newWeights);
    localStorage.setItem("gymTrackerBodyWeights", JSON.stringify(newWeights));
    db.update("body_weight_entries", id, { weight: Number(weight), recorded_on: recordedOn }).catch(syncErrorMessage);
  }

  function removeBodyWeight(id) {
    if (!window.confirm("Delete this body-weight entry?")) return;
    const newWeights = bodyWeights.filter((entry) => entry.id !== id);
    setBodyWeights(newWeights);
    localStorage.setItem("gymTrackerBodyWeights", JSON.stringify(newWeights));
    db.remove("body_weight_entries", id).catch(syncErrorMessage);
  }

  function saveCustomTemplate(name) {
    const trimmedName = name.trim();
    if (!trimmedName || todaysWorkout.length === 0) return false;

    const newTemplate = { id: crypto.randomUUID(), name: trimmedName, exerciseIds: todaysWorkout.map((exercise) => exercise.id), custom: true };
    const newTemplates = [
      ...customTemplates,
      newTemplate,
    ];
    setCustomTemplates(newTemplates);
    localStorage.setItem("gymTrackerCustomTemplates", JSON.stringify(newTemplates));
    db.insert("custom_templates", { user_id: session.user.id, name: trimmedName, exercise_ids: newTemplate.exerciseIds })
      .then(([row]) => setCustomTemplates((templates) => templates.map((template) => template.id === newTemplate.id ? { ...template, id: row.id } : template)))
      .catch(syncErrorMessage);
    return true;
  }

  function removeCustomTemplate(id) {
    const newTemplates = customTemplates.filter((template) => template.id !== id);
    setCustomTemplates(newTemplates);
    localStorage.setItem("gymTrackerCustomTemplates", JSON.stringify(newTemplates));
    db.remove("custom_templates", id).catch(syncErrorMessage);
  }

  function saveExerciseNote(exerciseName, note) {
    const newNotes = {
      ...exerciseNotes,
      [selectedUser]: {
        ...exerciseNotes[selectedUser],
        [exerciseName]: note,
      },
    };
    setExerciseNotes(newNotes);
    localStorage.setItem("gymTrackerExerciseNotes", JSON.stringify(newNotes));
    db.upsert("exercise_notes", { user_id: session.user.id, exercise_name: exerciseName, note }, "user_id,exercise_name").catch(syncErrorMessage);
  }

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("gymTrackerTheme", newTheme);
  }

  function removeHistoryEntry(id) {
    if (!window.confirm("Delete this history entry?")) return;

    const newHistory = workoutHistory.filter((entry) => entry.id !== id);
    setWorkoutHistory(newHistory);
    localStorage.setItem("gymTrackerHistory", JSON.stringify(newHistory));
    db.remove("workout_history", id).catch(syncErrorMessage);
  }

  async function handleSignIn(email, password) {
    const nextSession = await auth.signIn(email, password);
    setSession(nextSession);
    return nextSession;
  }

  async function handleSignUp(email, password) {
    const result = await auth.signUp(email, password);
    if (result.session?.access_token) setSession(result.session);
    return result;
  }

  async function handleSignOut() {
    await auth.signOut();
    setSession(null);
  }

  if (!session?.user) {
    return <Auth configured={isSupabaseConfigured} onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <div className={`app ${theme}-theme`}>
      <header className="app-header">
        <h1>Gym Tracker</h1>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☼" : "☾"}
        </button>
      </header>

      <div className="user-selector">
        <span>Signed in as: {selectedUser}</span>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>

      {syncError && <p className="sync-error">{syncError}</p>}

      <nav className="top-navigation" aria-label="Main navigation">
        <button onClick={() => setCurrentScreen("todaysWorkout")}>Today's Workout</button>
        <button onClick={() => setCurrentScreen("dashboard")}>Dashboard</button>
        <button onClick={() => setCurrentScreen("bodyWeight")}>Log Body Weight</button>
        <button onClick={() => setCurrentScreen("history")}>History</button>
      </nav>

      {currentScreen === "todaysWorkout" && (
        <TodaysWorkout
          todaysWorkout={todaysWorkout}
          openExercise={openExercise}
          removeExerciseFromWorkout={removeExerciseFromWorkout}
          setCurrentScreen={setCurrentScreen}
          finishWorkout={finishWorkout}
          resetWorkout={resetWorkout}
          workoutTemplates={[...workoutTemplates, ...customTemplates]}
          addTemplateToWorkout={addTemplateToWorkout}
          saveCustomTemplate={saveCustomTemplate}
          removeCustomTemplate={removeCustomTemplate}
          moveExercise={moveExercise}
        />
      )}

      {currentScreen === "muscleGroups" && (
        <MuscleGroups
          setCurrentScreen={setCurrentScreen}
          setSelectedMuscleGroup={setSelectedMuscleGroup}
        />
      )}

      {currentScreen === "exerciseSelection" && (
        <ExerciseSelection
          selectedMuscleGroup={selectedMuscleGroup}
          addExerciseToWorkout={addExerciseToWorkout}
          openExercise={openExercise}
        />
      )}

      {currentScreen === "exerciseWorkout" && (
        <ExerciseWorkout
          selectedExercise={selectedExercise}
          selectedUser={selectedUser}
          savedData={savedData}
          currentData={currentData}
          updateCurrentExercise={updateCurrentExercise}
          saveExercise={saveExercise}
          setCurrentScreen={setCurrentScreen}
          completeExercise={completeExercise}
          note={exerciseNotes[selectedUser]?.[selectedExercise.name] || ""}
          saveExerciseNote={saveExerciseNote}
          personalRecord={personalRecords[selectedUser]?.[selectedExercise.name]}
        />
      )}

      {currentScreen === "history" && (
        <WorkoutHistory
          selectedUser={selectedUser}
          workoutHistory={workoutHistory}
          removeHistoryEntry={removeHistoryEntry}
          setCurrentScreen={setCurrentScreen}
        />
      )}

      {currentScreen === "bodyWeight" && (
        <BodyWeight
          selectedUser={selectedUser}
          bodyWeights={bodyWeights}
          addBodyWeight={addBodyWeight}
          updateBodyWeight={updateBodyWeight}
          removeBodyWeight={removeBodyWeight}
          setCurrentScreen={setCurrentScreen}
        />
      )}

      {currentScreen === "dashboard" && (
        <Dashboard
          selectedUser={selectedUser}
          workoutHistory={workoutHistory}
          bodyWeights={bodyWeights}
        />
      )}
    </div>
  );
}

export default App;
