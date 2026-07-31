import { useState } from "react";

function formatSet(set) {
  if (set.duration !== undefined) {
    return `${set.duration} min${set.distance ? ` · ${set.distance} km` : ""}`;
  }

  return `${set.weight} kg × ${set.reps}`;
}

function WorkoutHistory({ selectedUser, workoutHistory, removeHistoryEntry, setCurrentScreen }) {
  const [openDates, setOpenDates] = useState([]);
  const dateGroups = workoutHistory
    .filter((entry) => entry.user === selectedUser)
    .reduce((groups, entry) => {
      const date = new Date(entry.savedAt);
      const dateKey = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = { timestamp: date.getTime(), entries: [] };
      }

      groups[dateKey].entries.push(entry);
      return groups;
    }, {});
  const orderedGroups = Object.entries(dateGroups).sort(
    ([, first], [, second]) => second.timestamp - first.timestamp
  );

  function toggleDate(dateKey) {
    setOpenDates((currentDates) =>
      currentDates.includes(dateKey)
        ? currentDates.filter((date) => date !== dateKey)
        : [...currentDates, dateKey]
    );
  }

  return (
    <div>
      <button onClick={() => setCurrentScreen("todaysWorkout")}>Back</button>
      <h2>{selectedUser}'s Exercise History</h2>

      {orderedGroups.length === 0 ? (
        <p>No saved exercises yet.</p>
      ) : (
        orderedGroups.map(([dateKey, group]) => {
          const isOpen = openDates.includes(dateKey);

          return (
            <section className="history-date-group" key={dateKey}>
              <button
                className="history-date-button"
                onClick={() => toggleDate(dateKey)}
                aria-expanded={isOpen}
              >
                {isOpen ? "▼" : "▶"} {dateKey} ({group.entries.length} workout{group.entries.length === 1 ? "" : "s"})
              </button>

              {isOpen && group.entries.map((entry) => (
                <div className="history-card" key={entry.id}>
                  <div className="history-card-heading">
                    <div>
                      <h3>{entry.exercise}</h3>
                      <p className="history-date">{new Date(entry.savedAt).toLocaleTimeString()}</p>
                    </div>
                    <button
                      className="delete-history-button"
                      onClick={() => removeHistoryEntry(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {entry.sets.map((set, index) => (
                    <p key={index}>Set {index + 1}: {formatSet(set)}</p>
                  ))}
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

export default WorkoutHistory;
