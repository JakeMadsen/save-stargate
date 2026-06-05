import { Heart, Mail, Send, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, postJson } from "../../api.js";
import { useAuth } from "../AuthContext.js";

type FanMessage = {
  _id: string;
  displayName?: string;
  message: string;
  anonymous: boolean;
  verifiedAt?: string;
  createdAt: string;
  authorId?: { displayName?: string; email?: string };
};

export const FanMessagesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [mode, setMode] = useState<"member" | "anonymous">(user ? "member" : "anonymous");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const load = () => api<{ messages: FanMessage[] }>("/api/public/fan-messages").then((data) => setMessages(data.messages));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!user) setMode("anonymous");
  }, [user]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    postJson("/api/public/fan-messages/verify", { token })
      .then(() => {
        setVerified(true);
        setNotice("Your message is confirmed and now visible. Thank you for adding your voice.");
        load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Verification failed"));
  }, [searchParams]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const result = await postJson<{ published: boolean; verificationLink?: string }>("/api/public/fan-messages", {
        displayName: form.get("displayName"),
        email: mode === "anonymous" ? form.get("email") : "",
        message: form.get("message"),
        website: form.get("website")
      });
      formElement.reset();
      if (result.published) {
        setNotice("Your message is live. Thank you for adding your voice.");
        await load();
      } else {
        setNotice("Check your email and confirm the link before your message appears.");
        if (result.verificationLink) setNotice(`Dev verification link: ${result.verificationLink}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit message");
    }
  };

  return (
    <section className="page-section fan-messages-page">
      <div className="page-title">
        <span><Heart size={17} /> Fan voices</span>
        <h1>Why Stargate Matters</h1>
        <p>Share what Stargate means to you and why you want to see the franchise back on screen.</p>
      </div>

      {verified && <p className="notice success">Message confirmed.</p>}
      {notice && <p className="notice success">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <div className="fan-message-layout">
        <form className="card write-us-form fan-message-form" onSubmit={submit}>
          <div className="segmented-control">
            <button type="button" className={mode === "member" ? "active" : ""} disabled={!user} onClick={() => setMode("member")}>
              <UserCheck size={16} /> Member
            </button>
            <button type="button" className={mode === "anonymous" ? "active" : ""} onClick={() => setMode("anonymous")}>
              <Mail size={16} /> Anonymous
            </button>
          </div>
          {!user && (
            <p className="notice">
              <Link to="/login">Log in</Link> to publish as a member, or post anonymously with email confirmation.
            </p>
          )}
          <div className="admin-form-grid">
            <label>
              <span>Name</span>
              <input name="displayName" maxLength={80} placeholder={mode === "anonymous" ? "Optional" : user?.displayName || user?.email || "Optional"} />
            </label>
            {mode === "anonymous" && (
              <label>
                <span>Email</span>
                <input name="email" type="email" required placeholder="Used only to confirm this message" />
              </label>
            )}
            <label className="field-long">
              <span>Message</span>
              <textarea
                name="message"
                required
                minLength={20}
                maxLength={4000}
                placeholder="Tell people why Stargate still matters."
              />
            </label>
            <label className="honeypot" aria-hidden="true">
              <span>Website</span>
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <button type="submit"><Send size={16} /> Share message</button>
        </form>

        <div className="fan-message-list">
          {messages.map((message) => (
            <article className="card fan-message-card" key={message._id}>
              <p>{message.message}</p>
              <div>
                <strong>{message.displayName || message.authorId?.displayName || message.authorId?.email || "A Stargate fan"}</strong>
                <span>{new Date(message.verifiedAt || message.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
          {messages.length === 0 && <p className="empty">No fan messages yet.</p>}
        </div>
      </div>
    </section>
  );
};
