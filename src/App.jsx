import "./App.css";
import { useEffect, useRef, useState } from "react";
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
import Friends from "./pages/Friends";
import WorkoutSession from "./pages/WorkoutSession";
import { auth, db, isSupabaseConfigured } from "./lib/supabase";

const workoutName = "Today's Workout";

function createEmptySet(exercise) {
  return exercise.tracking === "cardio"
    ? { duration: "", distance: "" }
    : { weight: "", reps: "" };
}

function calculateRecord(exercise, previous = {}, sets = []) {
  if (exercise?.tracking === "cardio") {
    return {
      longestDuration: Math.max(previous.longestDuration || 0, ...sets.map((set) => Number(set.duration) || 0)),
      longestDistance: Math.max(previous.longestDistance || 0, ...sets.map((set) => Number(set.distance) || 0)),
    };
  }

  return {
    highestWeight: Math.max(previous.highestWeight || 0, ...sets.map((set) => Number(set.weight) || 0)),
    mostReps: Math.max(previous.mostReps || 0, ...sets.map((set) => Number(set.reps) || 0)),
    estimatedOneRepMax: Math.max(previous.estimatedOneRepMax || 0, ...sets.map((set) => (Number(set.weight) || 0) * (1 + (Number(set.reps) || 0) / 30))),
    bestSetVolume: Math.max(previous.bestSetVolume || 0, ...sets.map((set) => (Number(set.weight) || 0) * (Number(set.reps) || 0))),
  };
}

function calculateRecordsFromHistory(history) {
  return history.reduce((records, entry) => {
    const exercise = exerciseDatabase.find((item) => item.name === entry.exercise);
    return { ...records, [entry.exercise]: calculateRecord(exercise, records[entry.exercise], entry.sets) };
  }, {});
}

function App() {
  const [session, setSession] = useState(() => auth.getSession());
  const [syncError, setSyncError] = useState("");
  const [achievementNotice, setAchievementNotice] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("Legs");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("todaysWorkout");
  const [todaysWorkout, setTodaysWorkout] = useState(() => {
    const stored = localStorage.getItem("todaysWorkout");
    return stored ? JSON.parse(stored) : [];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => localStorage.getItem("gymTrackerSelectedTemplateId") || ""
  );
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [sessionPreviousResults, setSessionPreviousResults] = useState([]);
  const [sessionPersonalRecords, setSessionPersonalRecords] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const selectedUser =
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "Gym Member";

  async function loadCloudData(attempt = 0) {
    try {
      const [historyRows, weightRows, noteRows, templateRows] = await Promise.all([
        db.select("workout_history", "&order=saved_at.desc"),
        db.select("body_weight_entries", "&order=recorded_on.desc"),
        db.select("exercise_notes"),
        db.select("custom_templates", "&order=created_at.desc"),
      ]);
      const history = historyRows.map((row) => ({
        id: row.id,
        user: selectedUser,
        exercise: row.exercise_name,
        sets: row.sets,
        savedAt: row.saved_at,
        sharedSessionId: row.shared_session_id,
      }));
      const weights = weightRows.map((row) => ({
        id: row.id,
        user: selectedUser,
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
      setExerciseNotes({ [selectedUser]: notes });
      setSavedData({ [selectedUser]: { [workoutName]: latestExerciseData } });
      const records = calculateRecordsFromHistory(history);
      setPersonalRecords({ [selectedUser]: records });
      localStorage.setItem("gymTrackerPersonalRecords", JSON.stringify({ [selectedUser]: records }));
      setSyncError("");
    } catch (error) {
      if (error.message.includes("JWT issued at future") && attempt < 3) {
        window.setTimeout(() => loadCloudData(attempt + 1), 1500);
        return;
      }
      syncErrorMessage(error, "Could not load your cloud data");
    }
  }

  function hasExpiredSession(error) {
    return /jwt.*expired|expired.*jwt|invalid jwt/i.test(error?.message || "");
  }

  function endExpiredSession() {
    auth.clearSession();
    setSession(null);
    setSyncError("");
    setAuthNotice("Your session expired. Please sign in again.");
  }

  function syncErrorMessage(error, prefix = "Could not save to Supabase") {
    if (hasExpiredSession(error)) {
      endExpiredSession();
      return;
    }
    setSyncError(`${prefix}: ${error.message}`);
  }

  async function loadSocialData() {
    try {
      const [requestRows, sessionRows, participantRows] = await Promise.all([
        db.select("friend_requests", "&order=created_at.desc"),
        db.select("workout_sessions", "&order=created_at.desc"),
        db.select("workout_session_participants"),
      ]);
      const userEmail = session.user.email.toLowerCase();
      setFriendRequests(requestRows.map((request) => {
        const outgoing = request.requester_id === session.user.id;
        return {
          id: request.id,
          direction: outgoing ? "outgoing" : "incoming",
          email: outgoing ? request.recipient_email : request.requester_email,
          name: outgoing ? request.recipient_name : request.requester_name,
          userId: outgoing ? request.recipient_id : request.requester_id,
          status: request.status,
        };
      }));
      const participants = participantRows.map((participant) => ({
        id: participant.id,
        sessionId: participant.session_id,
        userId: participant.user_id,
        email: participant.email,
        name: participant.participant_name,
        status: participant.status,
      }));
      setSessionParticipants(participants);
      setSessions(sessionRows.map((workoutSession) => {
        const mine = participants.find((participant) => participant.sessionId === workoutSession.id && (participant.userId === session.user.id || participant.email.toLowerCase() === userEmail));
        return {
          id: workoutSession.id,
          title: workoutSession.title,
          exerciseIds: workoutSession.exercise_ids,
          creatorName: workoutSession.creator_name,
          creatorEmail: workoutSession.creator_email,
          creatorId: workoutSession.creator_id,
          completedAt: workoutSession.completed_at,
          myStatus: mine?.status || "pending",
          participantId: mine?.id,
        };
      }));
    } catch (error) {
      syncErrorMessage(error, "Friends and sessions could not load");
    }
  }

  function getFriends() {
    return friendRequests
      .filter((request) => request.status === "accepted")
      .filter((request) => request.userId)
      .map((request) => ({ email: request.email, name: request.name, userId: request.userId }));
  }

  async function sendFriendRequest(recipientEmail) {
    const email = recipientEmail.toLowerCase();
    if (email === session.user.email.toLowerCase()) {
      window.alert("You cannot add yourself as a friend.");
      return;
    }
    try {
      await db.rpc("send_friend_request", {
        recipient_email: email,
        requester_display_name: selectedUser,
      });
      await loadSocialData();
      window.alert("Friend request sent.");
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function respondToFriendRequest(id, status) {
    try {
      await db.rpc("respond_to_friend_request", {
        request_id: id,
        next_status: status,
        next_name: selectedUser,
      });
      await loadSocialData();
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function startSession(friendIds, template) {
    if (!friendIds.length) return;
    try {
      await db.rpc("start_workout_session", {
        session_title: template.name,
        session_exercise_ids: template.exerciseIds,
        invited_friend_ids: friendIds,
      });
      await loadSocialData();
      setCurrentScreen("friends");
      window.alert("Session invitations sent. Friends must join before you can record their results.");
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function respondToSessionInvite(participantId, status) {
    try {
      await db.rpc("respond_to_session_invite", {
        invitation_id: participantId,
        next_status: status,
        next_name: selectedUser,
      });
      await loadSocialData();
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function openSession(workoutSession) {
    try {
      const [resultRows, previousRows, recordRows] = await Promise.all([
        db.select("workout_session_results", `&session_id=eq.${workoutSession.id}`),
        db.rpc("get_workout_session_previous_results", { target_session_id: workoutSession.id }),
        db.rpc("get_workout_session_personal_records", { target_session_id: workoutSession.id }),
      ]);
      setSessionResults(resultRows.map((result) => ({
        id: result.id,
        sessionId: result.session_id,
        participantId: result.participant_id,
        exerciseId: result.exercise_id,
        sets: result.sets,
      })));
      setSessionPreviousResults(previousRows.map((result) => ({
        participantId: result.participant_id,
        exerciseId: result.exercise_id,
        sets: result.sets,
        savedAt: result.saved_at,
      })));
      setSessionPersonalRecords(recordRows.map((record) => ({
        participantId: record.participant_id,
        exerciseId: record.exercise_id,
        highestWeight: Number(record.highest_weight) || 0,
        mostReps: Number(record.most_reps) || 0,
        estimatedOneRepMax: Number(record.estimated_one_rep_max) || 0,
        bestSetVolume: Number(record.best_set_volume) || 0,
        longestDuration: Number(record.longest_duration) || 0,
        longestDistance: Number(record.longest_distance) || 0,
      })));
      setSelectedSession(workoutSession);
      setCurrentScreen("workoutSession");
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function saveSessionResult(sessionId, participantId, exerciseId, sets) {
    try {
      const [saved] = await db.upsert("workout_session_results", {
        session_id: sessionId,
        participant_id: participantId,
        exercise_id: exerciseId,
        sets,
        updated_at: new Date().toISOString(),
      }, "session_id,participant_id,exercise_id");
      setSessionResults((current) => [
        ...current.filter((result) => !(result.sessionId === sessionId && result.participantId === participantId && result.exerciseId === exerciseId)),
        { id: saved.id, sessionId, participantId, exerciseId, sets: saved.sets },
      ]);
      return true;
    } catch (error) {
      syncErrorMessage(error);
      return false;
    }
  }

  async function finishSession(workoutSession) {
    const exerciseNames = Object.fromEntries(
      exerciseDatabase
        .filter((exercise) => workoutSession.exerciseIds.includes(exercise.id))
        .map((exercise) => [exercise.id, exercise.name])
    );
    try {
      await db.rpc("finish_workout_session", {
        target_session_id: workoutSession.id,
        exercise_names: exerciseNames,
      });
      await Promise.all([loadCloudData(), loadSocialData()]);
      setSelectedSession(null);
      setCurrentScreen("friends");
      window.alert("Session finished. Everyone's results are saved to history and the shared session is now closed.");
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function leaveSession(workoutSession) {
    if (!workoutSession.completedAt && !window.confirm("This session has not been finished and saved to history yet. Leave it anyway?")) {
      return;
    }
    try {
      await db.rpc("leave_workout_session", { target_session_id: workoutSession.id });
      if (selectedSession?.id === workoutSession.id) {
        setSelectedSession(null);
        setCurrentScreen("friends");
      }
      await loadSocialData();
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  async function updateSessionExercises(sessionId, exerciseIds) {
    try {
      await db.rpc("update_workout_session_exercises", {
        target_session_id: sessionId,
        updated_exercise_ids: exerciseIds,
      });
      const updateExercises = (workoutSession) => workoutSession.id === sessionId
        ? { ...workoutSession, exerciseIds }
        : workoutSession;
      setSessions((current) => current.map(updateExercises));
      setSelectedSession((current) => current ? updateExercises(current) : current);
    } catch (error) {
      syncErrorMessage(error);
    }
  }

  useEffect(() => {
    if (!session?.user) return undefined;
    const loadTimer = window.setTimeout(() => {
      loadCloudData();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [session]);

  useEffect(() => {
    function closeMenuWhenClickingOutside(event) {
      if (isAccountMenuOpen && !accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenuWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeMenuWhenClickingOutside);
  }, [isAccountMenuOpen]);

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

    const newHistoryEntry = { id: crypto.randomUUID(), user: selectedUser, exercise: exerciseName, sets: sets.map((set) => ({ ...set })), savedAt: new Date().toISOString(), sharedSessionId: null };
    const newHistory = [newHistoryEntry, ...workoutHistory];

    setSavedData(newData);
    setWorkoutHistory(newHistory);
    localStorage.setItem("gymTracker", JSON.stringify(newData));
    localStorage.setItem("gymTrackerHistory", JSON.stringify(newHistory));
    const achievements = updatePersonalRecords(exercise, sets);
    if (achievements.length) setAchievementNotice(`New personal record: ${achievements.join(" · ")}`);

    db.insert("workout_history", {
      user_id: session.user.id,
      exercise_name: exerciseName,
      sets: newHistoryEntry.sets,
    }).then(([row]) => {
      setWorkoutHistory((history) => history.map((entry) => entry.id === newHistoryEntry.id ? { ...entry, id: row.id, savedAt: row.saved_at } : entry));
    }).catch(syncErrorMessage);
  }

  function savePastWorkout(exercise, sets, recordedOn) {
    const savedAt = new Date(`${recordedOn}T12:00:00`).toISOString();
    const newHistoryEntry = {
      id: crypto.randomUUID(),
      user: selectedUser,
      exercise: exercise.name,
      sets: sets.map((set) => ({ ...set })),
      savedAt,
      sharedSessionId: null,
    };
    setWorkoutHistory((history) => [newHistoryEntry, ...history]);
    localStorage.setItem("gymTrackerHistory", JSON.stringify([newHistoryEntry, ...workoutHistory]));
    updatePersonalRecords(exercise, sets);

    db.insert("workout_history", {
      user_id: session.user.id,
      exercise_name: exercise.name,
      sets: newHistoryEntry.sets,
      saved_at: savedAt,
    }).then(([row]) => {
      setWorkoutHistory((history) => history.map((entry) => entry.id === newHistoryEntry.id ? { ...entry, id: row.id, savedAt: row.saved_at } : entry));
    }).catch(syncErrorMessage);
  }

  function updatePersonalRecords(exercise, sets) {
    const previous = personalRecords[selectedUser]?.[exercise.name] || {};
    const isCardio = exercise.tracking === "cardio";
    const nextRecord = calculateRecord(exercise, previous, sets);
    const newRecords = {
      ...personalRecords,
      [selectedUser]: {
        ...personalRecords[selectedUser],
        [exercise.name]: nextRecord,
      },
    };

    setPersonalRecords(newRecords);
    localStorage.setItem("gymTrackerPersonalRecords", JSON.stringify(newRecords));
    if (isCardio) return [];
    const achievements = [];
    if (nextRecord.highestWeight > (previous.highestWeight || 0)) achievements.push(`${nextRecord.highestWeight} kg heaviest weight`);
    if (nextRecord.mostReps > (previous.mostReps || 0)) achievements.push(`${nextRecord.mostReps} reps`);
    if (nextRecord.estimatedOneRepMax > (previous.estimatedOneRepMax || 0)) achievements.push(`${Math.round(nextRecord.estimatedOneRepMax)} kg estimated 1RM`);
    return achievements;
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
    setSelectedTemplateId(template.id);
    localStorage.setItem("gymTrackerSelectedTemplateId", template.id);
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
    setSelectedTemplateId("");
    setCurrentData(newCurrentData);
    localStorage.setItem("todaysWorkout", JSON.stringify([]));
    localStorage.removeItem("gymTrackerSelectedTemplateId");
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

  function setAppearance(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem("gymTrackerTheme", nextTheme);
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
    setAuthNotice("");
    return nextSession;
  }

  async function handleSignUp(email, password, displayName) {
    const result = await auth.signUp(email, password, displayName);
    if (result.session?.access_token) setSession(result.session);
    setAuthNotice("");
    return result;
  }

  async function handleSignOut() {
    await auth.signOut();
    setSession(null);
  }

  async function handleUpdateDisplayName(event) {
    event.preventDefault();
    const displayName = nameDraft.trim();
    if (!displayName) return;

    try {
      const updatedSession = await auth.updateDisplayName(displayName);
      setSession(updatedSession);
      setIsEditingName(false);
      setSyncError("");
    } catch (error) {
      setSyncError(`Could not update account name: ${error.message}`);
    }
  }

  if (!session?.user) {
    return <Auth configured={isSupabaseConfigured} notice={authNotice} onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <div className={`app ${theme}-theme`}>
      <header className="app-header">
        <h1><span className="title-accent">G</span>ym <span className="title-accent">T</span>racker</h1>
        <button
          className="theme-toggle"
          onClick={() => setAppearance(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☼" : "☾"}
        </button>
      </header>

      <div className="user-selector">
        {isEditingName ? (
          <form className="name-editor" onSubmit={handleUpdateDisplayName}>
            <label htmlFor="account-name-change">Account name</label>
            <input
              id="account-name-change"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="e.g. Tim"
              required
              autoFocus
            />
            <button className="save-button" type="submit">Save</button>
            <button type="button" onClick={() => setIsEditingName(false)}>Cancel</button>
          </form>
        ) : (
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">
              {selectedUser.slice(0, 1).toUpperCase()}
            </span>
            <span className="account-copy">
              <span className="account-label">Signed in as</span>
              <strong>{selectedUser}</strong>
            </span>
          </div>
        )}
        <details
          className="account-menu"
          ref={accountMenuRef}
          open={isAccountMenuOpen}
          onToggle={(event) => setIsAccountMenuOpen(event.currentTarget.open)}
        >
          <summary aria-label="Account options">
            <span className="menu-dots" aria-hidden="true" />
          </summary>
          <div className="account-menu-content">
            <button
              onClick={() => {
                setNameDraft(selectedUser);
                setIsEditingName(true);
                setIsAccountMenuOpen(false);
              }}
            >
              Change name
            </button>
            <button onClick={() => { setCurrentScreen("friends"); loadSocialData(); setIsAccountMenuOpen(false); }}>
              Friends & Sessions
            </button>
            <div className="appearance-options">
              <span className="appearance-label">Appearance</span>
              <div className="appearance-presets" role="group" aria-label="Colour theme">
                {[
                  ["dark", "Lime"],
                  ["ocean", "Ocean"],
                  ["berry", "Berry"],
                  ["light", "Light"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`appearance-preset ${value}-preset ${theme === value ? "selected" : ""}`}
                    onClick={() => { setAppearance(value); setIsAccountMenuOpen(false); }}
                    aria-pressed={theme === value}
                    title={label}
                  >
                    <span aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setIsAccountMenuOpen(false); handleSignOut(); }}>Sign Out</button>
          </div>
        </details>
      </div>

      {syncError && <p className="sync-error">{syncError}</p>}
      {achievementNotice && <button className="achievement-notice" onClick={() => setAchievementNotice("")}>🏆 {achievementNotice} <span>Dismiss</span></button>}

      <nav className="top-navigation" aria-label="Main navigation">
        <button className={currentScreen === "todaysWorkout" ? "active" : ""} onClick={() => setCurrentScreen("todaysWorkout")}>Workout</button>
        <button className={currentScreen === "dashboard" ? "active" : ""} onClick={() => setCurrentScreen("dashboard")}>Progress</button>
        <button className={currentScreen === "bodyWeight" ? "active" : ""} onClick={() => setCurrentScreen("bodyWeight")}>Weight</button>
        <button className={currentScreen === "history" ? "active" : ""} onClick={() => setCurrentScreen("history")}>History</button>
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
          hasSelectedTemplate={Boolean(selectedTemplateId)}
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
          bodyWeights={bodyWeights}
          removeHistoryEntry={removeHistoryEntry}
          savePastWorkout={savePastWorkout}
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

      {currentScreen === "friends" && (
        <Friends
          friends={getFriends()}
          friendRequests={friendRequests}
          sessions={sessions}
          workoutTemplates={[...workoutTemplates, ...customTemplates]}
          sendFriendRequest={sendFriendRequest}
          respondToFriendRequest={respondToFriendRequest}
          startSession={startSession}
          openSession={openSession}
          leaveSession={leaveSession}
          respondToSessionInvite={respondToSessionInvite}
          setCurrentScreen={setCurrentScreen}
        />
      )}

      {currentScreen === "workoutSession" && selectedSession && (
        <WorkoutSession
          session={selectedSession}
          participants={sessionParticipants.filter((participant) => participant.sessionId === selectedSession.id)}
          results={sessionResults}
          previousResults={sessionPreviousResults}
          personalRecords={sessionPersonalRecords}
          saveSessionResult={saveSessionResult}
          finishSession={finishSession}
          updateSessionExercises={updateSessionExercises}
          canEditExercises={selectedSession.creatorId === session.user.id}
          setCurrentScreen={setCurrentScreen}
        />
      )}
    </div>
  );
}

export default App;
