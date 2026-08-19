import { useState } from "react";

function Auth({ onSignIn, onSignUp, configured, notice }) {
  const [accountName, setAccountName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  async function submit(action) {
    if (!configured) {
      setMessage("Supabase is not connected yet. Add the environment values first.");
      return;
    }
    if (!email.trim() || !password) {
      setMessage("Enter your email address and password first.");
      return;
    }
    if (isCreatingAccount && !accountName.trim()) {
      setMessage("Choose an account name first.");
      return;
    }
    if (password.length < 6) {
      setMessage("Your password must contain at least 6 characters.");
      return;
    }
    if (isCreatingAccount && password !== confirmPassword) {
      setMessage("Your passwords do not match.");
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
      <form
        className="card auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (isCreatingAccount) {
            submit(() => onSignUp(email, password, accountName.trim()));
          } else {
            submit(() => onSignIn(email, password));
          }
        }}
      >
        <h2>{isCreatingAccount ? "Create Account" : "Sign In"}</h2>
        <p>{isCreatingAccount ? "Create an account to keep your workout data safely synced." : "Sign in to access your workouts and progress."}</p>
        {notice && <p className="auth-message">{notice}</p>}
        {isCreatingAccount && (
          <>
            <label htmlFor="account-name">Account name</label>
            <input
              id="account-name"
              type="text"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="e.g. Tim"
              required
            />
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {isCreatingAccount && (
          <>
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              minLength="6"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </>
        )}
        <button className="save-button" type="submit" disabled={busy}>
          {isCreatingAccount ? "Create Account" : "Sign In"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setIsCreatingAccount((current) => !current);
            setConfirmPassword("");
            setMessage("");
          }}
        >
          {isCreatingAccount ? "Back to Sign In" : "Create an Account"}
        </button>
        {message && <p className="auth-message">{message}</p>}
      </form>
    </main>
  );
}

export default Auth;
