import { useState } from "react";

function Auth({ onSignIn, onSignUp, configured }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action) {
    if (!configured) {
      setMessage("Supabase is not connected yet. Add the environment values first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await action(email, password);
      if (result?.user && !result?.session) {
        setMessage("Account created. Check your email to confirm it, then sign in.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <h1>Gym Tracker</h1>
      <form className="card auth-card" onSubmit={(event) => { event.preventDefault(); submit(onSignIn); }}>
        <h2>Sign In</h2>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button className="save-button" type="submit" disabled={busy}>Sign In</button>
        <button type="button" disabled={busy} onClick={() => submit(onSignUp)}>Create Account</button>
        {message && <p className="auth-message">{message}</p>}
      </form>
    </main>
  );
}

export default Auth;
