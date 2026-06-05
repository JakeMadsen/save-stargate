import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { postJson } from "../../api.js";

export const WriteUsPage = () => {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await postJson("/api/public/contact-messages", {
        name: form.get("name"),
        email: form.get("email"),
        subject: form.get("subject"),
        category: form.get("category"),
        message: form.get("message"),
        website: form.get("website")
      });
      setSent(true);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    }
  };

  return (
    <section className="page-section write-us-page">
      <div className="page-title">
        <span><Mail size={17} /> Write us</span>
        <h1>Contact Save The Gate</h1>
        <p>Send notes, corrections, resources, press questions, or offers to help. Messages land in the site inbox for review.</p>
      </div>

      <form className="card write-us-form" onSubmit={submit}>
        <div className="admin-form-grid">
          <label>
            <span>Name</span>
            <input name="name" maxLength={100} placeholder="Optional" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="Optional, only if you want a reply later" />
          </label>
          <label>
            <span>Category</span>
            <select name="category" defaultValue="general">
              <option value="general">General</option>
              <option value="press">Press</option>
              <option value="volunteer">Volunteer</option>
              <option value="resource">Resource</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field-long">
            <span>Subject</span>
            <input name="subject" required minLength={3} maxLength={140} />
          </label>
          <label className="field-long">
            <span>Message</span>
            <textarea name="message" required minLength={10} maxLength={5000} />
          </label>
          <label className="honeypot" aria-hidden="true">
            <span>Website</span>
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit"><Send size={16} /> Send message</button>
        {sent && <p className="notice success">Message received. Thank you.</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
};
