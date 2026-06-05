import { KeyRound, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { postJson } from "../../api.js";
import { useAuth } from "../AuthContext.js";

export const LoginPage = () => {
  const [error, setError] = useState("");
  const { refresh } = useAuth();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await postJson("/api/auth/login", {
        email: form.get("email"),
        password: form.get("password")
      });
      await refresh();
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <section className="auth-panel">
      <div className="card form-card">
        <div className="card-kicker"><KeyRound size={16} /> Staff login</div>
        <h1>Log in</h1>
        <p>Use your staff email and password.</p>
        <form onSubmit={submit}>
          <input name="email" type="email" required placeholder="you@example.com" />
          <input name="password" type="password" required minLength={8} placeholder="Password" />
          <button type="submit">Log in</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
};

export const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(searchParams.get("token") ?? "");
  }, [searchParams]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await postJson("/api/auth/invites/accept", {
        token,
        displayName: form.get("displayName"),
        password: form.get("password")
      });
      await refresh();
      setMessage("Password created. You are logged in.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invite could not be accepted");
    }
  };

  return (
    <section className="auth-panel">
      <div className="card form-card">
        <div className="card-kicker"><MailCheck size={16} /> Staff invite</div>
        <h1>Create password</h1>
        {!token ? (
          <p className="error">Missing invite token.</p>
        ) : (
          <form onSubmit={submit}>
            <input name="displayName" placeholder="Display name" />
            <input name="password" type="password" required minLength={10} placeholder="Choose a password" />
            <button type="submit">Create password</button>
          </form>
        )}
        {message && <p className={message.includes("logged in") ? "notice" : "error"}>{message}</p>}
        <Link className="secondary-button" to="/admin">Go to admin</Link>
      </div>
    </section>
  );
};
