import { useMemo, useState } from "react";

function Friends({
  friends,
  friendRequests,
  sessions,
  workoutTemplates,
  sendFriendRequest,
  respondToFriendRequest,
  startSession,
  openSession,
  leaveSession,
  respondToSessionInvite,
  setCurrentScreen,
}) {
  const [email, setEmail] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [templateId, setTemplateId] = useState(workoutTemplates[0]?.id || "");
  const incoming = friendRequests.filter((request) => request.direction === "incoming" && request.status === "pending");
  const pendingSessions = sessions.filter((session) => session.myStatus === "pending");
  const selectedTemplate = useMemo(
    () => workoutTemplates.find((template) => String(template.id) === String(templateId)),
    [templateId, workoutTemplates]
  );

  function submitFriend(event) {
    event.preventDefault();
    if (!email.trim()) return;
    sendFriendRequest(email.trim());
    setEmail("");
  }

  function submitSession(event) {
    event.preventDefault();
    if (!selectedTemplate || selectedFriendIds.length === 0) return;
    startSession(selectedFriendIds, selectedTemplate);
  }

  return (
    <main className="friends-page">
      <button onClick={() => setCurrentScreen("todaysWorkout")}>Back to Workout</button>
      <h2>Friends & Sessions</h2>
      <p>Invite friends, then start a shared workout and record everybody’s results.</p>

      <section className="card">
        <h3>Add a friend</h3>
        <form className="inline-form" onSubmit={submitFriend}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Friend’s account email" required />
          <button className="save-button" type="submit">Send request</button>
        </form>
      </section>

      {incoming.length > 0 && (
        <section className="card">
          <h3>Friend requests</h3>
          {incoming.map((request) => (
            <div className="friend-row" key={request.id}>
              <span><strong>{request.name || request.email}</strong><small>{request.email}</small></span>
              <div><button className="save-button" onClick={() => respondToFriendRequest(request.id, "accepted")}>Accept</button><button onClick={() => respondToFriendRequest(request.id, "declined")}>Decline</button></div>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3>Your friends</h3>
        {friends.length ? friends.map((friend) => <div className="friend-row" key={friend.userId}><span><strong>{friend.name || friend.email}</strong><small>{friend.email}</small></span><span className="status-chip">Friends</span></div>) : <p>No friends yet. Send an invitation above.</p>}
      </section>

      <section className="card">
        <h3>Start a workout session</h3>
        <form onSubmit={submitSession}>
          <label htmlFor="session-template">Workout template</label>
          <select id="session-template" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {workoutTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <p className="form-help">Choose friends to invite. They must accept before you can add their sets.</p>
          <div className="friend-picker">
            {friends.map((friend) => <label key={friend.userId}><input type="checkbox" checked={selectedFriendIds.includes(friend.userId)} onChange={() => setSelectedFriendIds((ids) => ids.includes(friend.userId) ? ids.filter((id) => id !== friend.userId) : [...ids, friend.userId])} /> {friend.name || friend.email}</label>)}
          </div>
          <button className="save-button" type="submit" disabled={!friends.length || !selectedFriendIds.length}>Send session invites</button>
        </form>
      </section>

      {pendingSessions.length > 0 && <section className="card"><h3>Session invitations</h3>{pendingSessions.map((session) => <div className="friend-row" key={session.id}><span><strong>{session.title}</strong><small>Hosted by {session.creatorName || session.creatorEmail}</small></span><div><button className="save-button" onClick={() => respondToSessionInvite(session.participantId, "accepted")}>Join</button><button onClick={() => respondToSessionInvite(session.participantId, "declined")}>Decline</button></div></div>)}</section>}

      <section className="card">
        <h3>Workout sessions</h3>
        {sessions.filter((session) => session.myStatus !== "declined").length ? sessions.filter((session) => session.myStatus !== "declined").map((session) => <div className="friend-row" key={session.id}><span><strong>{session.title}</strong><small>{session.completedAt ? "Completed" : session.myStatus === "pending" ? "Invitation pending" : "Ready to train"}</small></span><div><button onClick={() => openSession(session)} disabled={session.myStatus === "pending"}>Open</button><button className="leave-session-button" onClick={() => leaveSession(session)}>Leave</button></div></div>) : <p>No sessions yet.</p>}
      </section>
    </main>
  );
}

export default Friends;
