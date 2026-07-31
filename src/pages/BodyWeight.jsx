import { useState } from "react";

function BodyWeight({
  selectedUser,
  bodyWeights,
  addBodyWeight,
  updateBodyWeight,
  removeBodyWeight,
  setCurrentScreen,
}) {
  const [weight, setWeight] = useState("");
  const [recordedOn, setRecordedOn] = useState(new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");
  const entries = bodyWeights
    .filter((entry) => entry.user === selectedUser)
    .sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));

  function handleSubmit(event) {
    event.preventDefault();
    if (!weight || Number(weight) <= 0) return;
    addBodyWeight(weight, recordedOn);
    setWeight("");
  }

  function startEditing(entry) {
    setEditingId(entry.id);
    setEditWeight(String(entry.weight));
    setEditDate(entry.recordedOn);
  }

  function saveEdit(id) {
    if (!editWeight || Number(editWeight) <= 0 || !editDate) return;
    updateBodyWeight(id, editWeight, editDate);
    setEditingId(null);
  }

  return (
    <div>
      <button onClick={() => setCurrentScreen("todaysWorkout")}>Back</button>
      <h2>Log Body Weight</h2>
      <p>{selectedUser}'s measurements are used in the dashboard.</p>

      <form className="card weight-form" onSubmit={handleSubmit}>
        <label htmlFor="body-weight">Weight (kg)</label>
        <input id="body-weight" type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} required />
        <label htmlFor="recorded-on">Date</label>
        <input id="recorded-on" type="date" value={recordedOn} onChange={(event) => setRecordedOn(event.target.value)} required />
        <button className="save-button" type="submit">Save Weight</button>
      </form>

      <h3>Previous Measurements</h3>
      {entries.length === 0 ? (
        <p>No body-weight measurements yet.</p>
      ) : (
        entries.map((entry) => (
          <div className="measurement-row" key={entry.id}>
            {editingId === entry.id ? (
              <>
                <input aria-label="Weight in kilograms" type="number" min="1" step="0.1" value={editWeight} onChange={(event) => setEditWeight(event.target.value)} />
                <input aria-label="Measurement date" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
                <button className="save-button" onClick={() => saveEdit(entry.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                {entry.recordedOn}: <strong>{entry.weight} kg</strong>
                <button onClick={() => startEditing(entry)}>Edit</button>
                <button className="delete-history-button" onClick={() => removeBodyWeight(entry.id)}>Delete</button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default BodyWeight;
