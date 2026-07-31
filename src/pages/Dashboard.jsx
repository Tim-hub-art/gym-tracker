import { useMemo, useState } from "react";

function LineChart({ title, points, unit }) {
  if (points.length === 0) {
    return <p className="chart-empty">Record some data to see this graph.</p>;
  }

  const width = 640;
  const height = 240;
  const padding = 42;
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const coordinates = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const y = height - padding - ((point.value - minimum) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="chart" role="img" aria-label={`${title} line chart`}>
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <polyline points={path} className="chart-line" />
        {coordinates.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="5" className="chart-dot" />)}
        <text x="4" y={padding + 5} className="chart-label">{maximum} {unit}</text>
        <text x="4" y={height - padding} className="chart-label">{minimum} {unit}</text>
        <text x={padding} y={height - 12} className="chart-label">{points[0].label}</text>
        {points.length > 1 && (
          <text x={width - padding} y={height - 12} textAnchor="end" className="chart-label">
            {points.at(-1).label}
          </text>
        )}
      </svg>
    </div>
  );
}

function Dashboard({ selectedUser, workoutHistory, bodyWeights }) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const userHistory = useMemo(
    () => workoutHistory.filter((entry) => entry.user === selectedUser).sort((a, b) => a.savedAt.localeCompare(b.savedAt)),
    [workoutHistory, selectedUser]
  );
  const exerciseNames = useMemo(
    () => [...new Set(userHistory.map((entry) => entry.exercise))],
    [userHistory]
  );

  const activeExercise = exerciseNames.includes(selectedExercise)
    ? selectedExercise
    : exerciseNames[0] || "";
  const activeExerciseIndex = exerciseNames.indexOf(activeExercise);
  const bodyWeightPoints = bodyWeights
    .filter((entry) => entry.user === selectedUser)
    .sort((a, b) => a.recordedOn.localeCompare(b.recordedOn))
    .map((entry) => ({ id: entry.id, value: entry.weight, label: entry.recordedOn.slice(5) }));
  const strengthPoints = userHistory
    .filter((entry) => entry.exercise === activeExercise)
    .map((entry) => ({
      id: entry.id,
      value: Math.max(...entry.sets.map((set) => Number(set.weight) || 0)),
      label: new Date(entry.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }))
    .filter((entry) => entry.value > 0);

  return (
    <div>
      <h2>{selectedUser}'s Dashboard</h2>
      <LineChart title="Body Weight" points={bodyWeightPoints} unit="kg" />

      <div className="chart">
        <label htmlFor="exercise-progress">Exercise Progress</label>
        <div className="exercise-switcher">
          <button
            onClick={() => setSelectedExercise(exerciseNames[activeExerciseIndex - 1])}
            disabled={activeExerciseIndex <= 0}
          >
            Previous
          </button>
          <select
            id="exercise-progress"
            value={activeExercise}
            onChange={(event) => setSelectedExercise(event.target.value)}
          >
            {exerciseNames.length === 0 ? (
              <option value="">No saved strength exercises</option>
            ) : (
              exerciseNames.map((exercise) => <option key={exercise} value={exercise}>{exercise}</option>)
            )}
          </select>
          <button
            onClick={() => setSelectedExercise(exerciseNames[activeExerciseIndex + 1])}
            disabled={activeExerciseIndex === -1 || activeExerciseIndex >= exerciseNames.length - 1}
          >
            Next
          </button>
        </div>
        <LineChart title={activeExercise || "Exercise Progress"} points={strengthPoints} unit="kg" />
      </div>
    </div>
  );
}

export default Dashboard;
