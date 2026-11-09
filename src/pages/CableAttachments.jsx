import { cableAttachments } from "../data/cableAttachments";

function CableAttachments({ setSelectedCableAttachment, setCurrentScreen }) {
  return (
    <div>
      <button onClick={() => setCurrentScreen("muscleGroups")}>Back</button>
      <h2>Cable Tower</h2>
      <p>Choose the attachment on the cable pillar.</p>
      <div className="cable-attachment-grid">
        {cableAttachments.map((attachment) => (
          <button
            className="cable-attachment-button"
            key={attachment.id}
            onClick={() => {
              setSelectedCableAttachment(attachment.id);
              setCurrentScreen("exerciseSelection");
            }}
          >
            <span aria-hidden="true">{attachment.emoji}</span>
            {attachment.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CableAttachments;
