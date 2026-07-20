import "./App.css";
import { useState } from "react";
import { workouts } from "./data/workouts";
import ExerciseCard from "./components/ExerciseCard.jsx";

function App() {
  const [selectedWorkout, setSelectedWorkout] = useState("A");
  const [selectedUser, setSelectedUser] = useState("Tim");

  const [savedData, setSavedData] = useState(() => {
  const stored = localStorage.getItem("gymTracker");

  if (stored) {
    return JSON.parse(stored);
  }

  return {};
});

const [currentData, setCurrentData] = useState(() => {
  const stored = localStorage.getItem("gymTrackerCurrent");

  if (stored) {
    return JSON.parse(stored);
  }

  return {};
});

  function saveExercise(workout, exercise, sets) {
  const newData = {
    ...savedData,

    [selectedUser]: {
      ...savedData[selectedUser],

      [workout]: {
        ...savedData[selectedUser]?.[workout],

        [exercise]: {
          sets
        },
      },
    },
  };

  setSavedData(newData);

  localStorage.setItem(
    "gymTracker",
    JSON.stringify(newData)
  );
}

function updateCurrentExercise(workout, exercise, sets) {
  const newData = {
    ...currentData,

    [selectedUser]: {
      ...currentData[selectedUser],

      [workout]: {
        ...currentData[selectedUser]?.[workout],

        [exercise]: {
          sets,
        },
      },
    },
  };

  setCurrentData(newData);

  localStorage.setItem(
    "gymTrackerCurrent",
    JSON.stringify(newData)
  );
}

  return (
    <div className="app">
      <h1>🏋️ Gym Tracker</h1>
      <div className="user-selector">
  <label>User: </label>

  <select
    value={selectedUser}
    onChange={(e) => setSelectedUser(e.target.value)}
  >
    <option value="Tim">Tim</option>
    <option value="Gerard">Gerard</option>
  </select>
</div>

      <div className="workout-buttons">
        <button onClick={() => setSelectedWorkout("A")}>Workout A</button>
        <button onClick={() => setSelectedWorkout("B")}>Workout B</button>
        <button onClick={() => setSelectedWorkout("C")}>Workout C</button>
      </div>

      <h2>Workout {selectedWorkout}</h2>

      {workouts[selectedWorkout].map((exercise) => {
     const previous =
  savedData[selectedUser]?.[selectedWorkout]?.[exercise] || {};
    const current =
  currentData[selectedUser]?.[selectedWorkout]?.[exercise] || {
    sets: [{ weight: "", reps: "" }],
  };
        return (
          <ExerciseCard
  key={exercise}
  workout={selectedWorkout}
  exercise={exercise}
  previous={previous}
  current={current}
  updateCurrentExercise={updateCurrentExercise}
  saveExercise={saveExercise}
/>
        );
      })}
    </div>
  );
}

export default App;