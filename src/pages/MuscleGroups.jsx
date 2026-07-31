import { muscleGroups } from "../data/muscleGroups";

function MuscleGroups({ setCurrentScreen, setSelectedMuscleGroup }) {
  return (
    <div>
      <h2>Select Muscle Group</h2>

      {muscleGroups.map((group) => (
        <button
          key={group.id}
          onClick={() => {
            setSelectedMuscleGroup(group.name);
            setCurrentScreen("exerciseSelection");
          }}
        >
          {group.emoji} {group.name}
        </button>
      ))}
    </div>
  );
}

export default MuscleGroups;