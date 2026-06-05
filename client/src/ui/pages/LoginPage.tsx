import { KeyRound, MailCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { postJson } from "../../api.js";
import { isStaff, useAuth } from "../AuthContext.js";

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
      }).then(async (result: any) => {
        await refresh();
        window.location.href = isStaff(result.user?.role) ? "/admin" : "/community";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <section className="auth-panel">
      <div className="card form-card">
        <div className="card-kicker"><KeyRound size={16} /> Account login</div>
        <h1>Log in</h1>
        <p>Use your email and password to comment or manage the site.</p>
        <form onSubmit={submit}>
          <input name="email" type="email" required placeholder="you@example.com" />
          <input name="password" type="password" required minLength={6} placeholder="Password" />
          <button type="submit">Log in</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="auth-switch">
          New here? <Link className="text-link" to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
};

export const SignupPage = () => {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevLink("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      const result = await postJson<{ message?: string; verificationLink?: string }>("/api/auth/signup", {
        email: form.get("email"),
        displayName: form.get("displayName"),
        password
      });
      setMessage(result.message ?? "Check your email for a verification link.");
      setDevLink(result.verificationLink ?? "");
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-panel">
      <div className="card form-card">
        <div className="card-kicker"><UserPlus size={16} /> Join the discussion</div>
        <h1>Sign up</h1>
        <p>Create an account, verify your email, and join comments or community threads.</p>
        <form onSubmit={submit}>
          <input name="displayName" minLength={2} maxLength={80} placeholder="Display name" />
          <input name="email" type="email" required placeholder="you@example.com" />
          <input name="password" type="password" required minLength={6} placeholder="Password" />
          <input name="confirmPassword" type="password" required minLength={6} placeholder="Confirm password" />
          <button type="submit" disabled={submitting}>{submitting ? "Creating account..." : "Create account"}</button>
        </form>
        {message && <p className="notice success">{message}</p>}
        {devLink && <p className="notice">Development verify link: <a href={devLink}>{devLink}</a></p>}
        {error && <p className="error">{error}</p>}
        <p className="auth-switch">
          Already have an account? <Link className="text-link" to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
};

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [message, setMessage] = useState("Verifying your email...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    postJson("/api/auth/verify-email", { token })
      .then(async () => {
        await refresh();
        setOk(true);
        setMessage("Email verified. You are logged in.");
      })
      .catch((err) => {
        setOk(false);
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [searchParams]);

  return (
    <section className="auth-panel">
      <div className="card form-card">
        <div className="card-kicker"><MailCheck size={16} /> Email verification</div>
        <h1>{ok ? "Verified" : "Verify email"}</h1>
        <p className={ok ? "notice success" : "error"}>{message}</p>
        {ok ? <Link className="primary-button" to="/community">Go to community</Link> : <Link className="secondary-button" to="/signup">Back to signup</Link>}
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
            <input name="password" type="password" required minLength={6} placeholder="Choose a password" />
            <button type="submit">Create password</button>
          </form>
        )}
        {message && <p className={message.includes("logged in") ? "notice" : "error"}>{message}</p>}
        <Link className="secondary-button" to="/admin">Go to admin</Link>
      </div>
    </section>
  );
};
