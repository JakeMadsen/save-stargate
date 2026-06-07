import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Twitter,
  Youtube
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, postJson } from "../../api.js";
import { Seo } from "../Seo.js";

type ContactLink = {
  label: string;
  type:
    | "website"
    | "email"
    | "facebook"
    | "x"
    | "instagram"
    | "tiktok"
    | "youtube"
    | "linkedin"
    | "production"
    | "address"
    | "source"
    | "other";
  url: string;
};

type Contact = {
  _id: string;
  name: string;
  kind?: "entity" | "person";
  organization?: string;
  role?: string;
  address?: string;
  publicContactUrl?: string;
  sourceUrl?: string;
  imageUrl?: string;
  imageSourceUrl?: string;
  links?: ContactLink[];
  priority: number;
  suggestedMessage: string;
  notes?: string;
};

const linkIcons = {
  website: Globe,
  email: Mail,
  facebook: Facebook,
  x: Twitter,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  linkedin: Linkedin,
  production: BriefcaseBusiness,
  address: MapPin,
  source: ExternalLink,
  other: ExternalLink
};

const fallbackLinks = (contact: Contact): ContactLink[] => {
  if (contact.links?.length) return contact.links;
  return [
    contact.publicContactUrl ? { label: "Contact", type: "website" as const, url: contact.publicContactUrl } : null,
    contact.sourceUrl ? { label: "Source", type: "source" as const, url: contact.sourceUrl } : null
  ].filter(Boolean) as ContactLink[];
};

const ContactCard = ({ contact }: { contact: Contact }) => {
  const links = fallbackLinks(contact);
  const isEntity = contact.kind === "entity";

  return (
    <article className="card contact-card" id={`contact-${contact._id}`}>
      <div className="card-kicker">
        {isEntity ? <Building2 size={15} /> : <BriefcaseBusiness size={15} />}
        {isEntity ? "Entity" : "Person"} · Priority {contact.priority}
      </div>
      <h3>{contact.name}</h3>
      {contact.imageUrl && (
        <div className={`contact-image-frame ${isEntity ? "entity" : "person"}`}>
          <img src={contact.imageUrl} alt={contact.name} loading="lazy" />
        </div>
      )}
      {(contact.role || contact.organization) && (
        <p>
          {contact.role && <strong>{contact.role}</strong>}
          {contact.role && contact.organization ? ", " : ""}
          {contact.organization}
        </p>
      )}
      {contact.address && (
        <p className="address-line">
          <MapPin size={16} /> {contact.address}
        </p>
      )}
      <blockquote>{contact.suggestedMessage}</blockquote>
      {contact.notes && <p>{contact.notes}</p>}
      <div className="contact-link-grid">
        {links.map((link) => {
          const Icon = linkIcons[link.type] ?? ExternalLink;
          return (
            <a className={`contact-link ${link.type}`} key={`${link.type}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
              <span className="contact-link-icon">
                <Icon size={16} />
              </span>
              <span>{link.label}</span>
            </a>
          );
        })}
      </div>
      <SuggestionForm
        contactId={contact._id}
        targetName={contact.name}
        kind={contact.kind ?? "person"}
        buttonLabel="Suggest contact information"
      />
    </article>
  );
};

const SuggestionForm = ({
  contactId,
  targetName,
  kind,
  buttonLabel
}: {
  contactId?: string;
  targetName?: string;
  kind?: "entity" | "person";
  buttonLabel: string;
}) => {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await postJson("/api/public/contact-suggestions", {
        contactTargetId: contactId || undefined,
        targetName: targetName || form.get("targetName"),
        kind: kind || form.get("kind") || "entity",
        submitterName: form.get("submitterName"),
        submitterEmail: form.get("submitterEmail"),
        suggestedLabel: form.get("suggestedLabel"),
        suggestedType: form.get("suggestedType"),
        suggestedUrl: form.get("suggestedUrl"),
        notes: form.get("notes")
      });
      setSent(true);
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit suggestion");
    }
  };

  return (
    <div className="suggestion-box">
      <button type="button" className="secondary-button small" onClick={() => setOpen((value) => !value)}>
        {buttonLabel}
      </button>
      {open && (
        <form className="suggestion-form" onSubmit={submit}>
          {!targetName && (
            <>
              <label>
                <span>Contact name</span>
                <input name="targetName" required minLength={2} maxLength={160} />
              </label>
              <label>
                <span>Type</span>
                <select name="kind" defaultValue="entity">
                  <option value="entity">Entity</option>
                  <option value="person">Person</option>
                </select>
              </label>
            </>
          )}
          <label>
            <span>Link label</span>
            <input name="suggestedLabel" required minLength={2} maxLength={100} placeholder="LinkedIn, work email, official site..." />
          </label>
          <label>
            <span>Link type</span>
            <select name="suggestedType" defaultValue="other">
              <option value="website">Website</option>
              <option value="email">Email</option>
              <option value="facebook">Facebook</option>
              <option value="x">X</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
              <option value="production">Production contact</option>
              <option value="source">Source</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>Link or email</span>
            <input name="suggestedUrl" required placeholder="https://... or mailto:name@example.com" />
          </label>
          <label>
            <span>Where did this come from?</span>
            <textarea name="notes" required minLength={5} maxLength={1500} />
          </label>
          <div className="suggestion-form-grid">
            <label>
              <span>Your name</span>
              <input name="submitterName" maxLength={100} />
            </label>
            <label>
              <span>Your email</span>
              <input name="submitterEmail" type="email" />
            </label>
          </div>
          <button type="submit">Submit for review</button>
          {sent && <p className="notice">Suggestion sent for review.</p>}
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  );
};

export const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/public/contacts").then((data) => setContacts(data.contacts));
  }, []);

  const entities = contacts.filter((contact) => contact.kind === "entity");
  const people = contacts.filter((contact) => contact.kind !== "entity");

  return (
    <section className="page-section">
      <Seo
        title="Who To Contact"
        description="Public contact targets, company profiles, professional channels, and suggested messages for the Save The Gate campaign."
        path="/contacts"
      />
      <div className="page-title">
        <span>Contacts</span>
        <h1>Contact Directory</h1>
        <p>Companies and people connected to the decision. Use public and work channels.</p>
      </div>
      <div className="card suggestion-callout">
        <div>
          <h3>Know a contact we missed?</h3>
          <p>Send a source, profile, work email, or company page. It will sit in review before it appears.</p>
        </div>
        <SuggestionForm buttonLabel="Suggest new contact" />
      </div>
      <div className="section-heading"><span>Entities</span></div>
      <div className="card-grid two contact-section">
        {entities.map((contact) => <ContactCard key={contact._id} contact={contact} />)}
      </div>
      <div className="section-heading contact-heading"><span>People</span></div>
      <div className="card-grid two contact-section">
        {people.map((contact) => <ContactCard key={contact._id} contact={contact} />)}
        {people.length === 0 && <p className="empty">No individual contacts listed yet.</p>}
      </div>
    </section>
  );
};
