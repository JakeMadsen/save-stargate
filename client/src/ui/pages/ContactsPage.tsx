import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Globe,
  Headphones,
  Instagram,
  Landmark,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  PenLine,
  PhoneCall,
  Share2,
  Twitter,
  Youtube
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { api, postJson } from "../../api.js";
import { outboundTrackingProps } from "../../tracking.js";
import { PetitionCard, type Petition } from "../components.js";
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

const TrackedContactInlineLink = ({ href, label, children }: { href: string; label: string; children: ReactNode }) => (
  <a
    href={href}
    {...outboundTrackingProps({ category: "contact", label, targetUrl: href })}
  >
    {children}
  </a>
);

const amazonOutreachOptions = [
  {
    title: "Share and hashtag",
    label: "Public signal",
    icon: Share2,
    body: "Make the campaign visible where other fans, journalists, and studio accounts can see it.",
    items: [
      <><strong>Use the campaign tags:</strong> #SaveTheGate, #SaveStargate, #GerosGate, and #Stargate.</>,
      <><strong>Share the petitions:</strong> post the petition links with a short personal reason for why Stargate should continue.</>,
      <><strong>Keep it easy to amplify:</strong> write something respectful, specific, and simple enough for other fans to repost.</>
    ]
  },
  {
    title: "Prime support feedback",
    label: "Support route",
    icon: Headphones,
    body: "Contact Prime support directly and ask that your feedback be passed to the right team.",
    items: [
      <><strong>Request a callback:</strong> speak to a representative directly. Please be respectful.</>,
      <><strong>Use live chat:</strong> if you use chat, continue until the AI forwards your comments to the correct department.</>
    ],
    actions: [
      { label: "Amazon support", href: "https://www.amazon.com/gp/help/customer/contact-us" }
    ]
  },
  {
    title: "Call the studios",
    label: "Phone route",
    icon: PhoneCall,
    body: "This suggestion comes from fan outreach around Michael Shanks. Call the studio to respectfully register your request.",
    items: [
      <><strong>MGM Studios toll-free:</strong> <TrackedContactInlineLink href="tel:+18883649521" label="MGM Studios toll-free">(888) 364-9521</TrackedContactInlineLink></>,
      <><strong>Culver Studios facility:</strong> <TrackedContactInlineLink href="tel:+13102021234" label="Culver Studios facility">(310) 202-1234</TrackedContactInlineLink></>,
      <><strong>Tell them why:</strong> let them know respectfully that you want the Gero-led Stargate project to continue.</>
    ]
  },
  {
    title: "Write a letter",
    label: "Mail route",
    icon: PenLine,
    body: "Physical mail stands out. Send your thoughts directly to studio executives.",
    address: "Amazon MGM Studios\n9336 W Washington Blvd\nCulver City, CA 90232",
    items: [
      <><strong>The tissue box campaign:</strong> mail a physical box of tissues with <em>Thanks Send More</em> written on it, along with a respectful letter supporting Gero's project. <strong>Warning:</strong> please do not send anything offensive or aggressive.</>
    ]
  }
];

const campaignFundraiserUrl = "https://www.gofundme.com/f/savestargate-dont-close-the-gate";

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
            <a
              className={`contact-link ${link.type}`}
              key={`${link.type}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              {...outboundTrackingProps({
                category: "contact",
                label: `${contact.name}: ${link.label}`,
                targetUrl: link.url
              })}
            >
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
  const [petitions, setPetitions] = useState<Petition[]>([]);

  useEffect(() => {
    Promise.all([
      api<{ contacts: Contact[] }>("/api/public/contacts"),
      api<{ petitions: Petition[] }>("/api/public/petitions")
    ]).then(([contactData, petitionData]) => {
      setContacts(contactData.contacts);
      setPetitions(petitionData.petitions);
    });
  }, []);

  const entities = contacts.filter((contact) => contact.kind === "entity");
  const people = contacts.filter((contact) => contact.kind !== "entity");

  return (
    <section className="page-section help-page">
      <Seo
        title="Take Action"
        description="Sign Stargate petitions, reach out to Amazon and Amazon MGM Studios, and find public contact targets for the Save The Gate campaign."
        path="/contacts"
      />
      <div className="help-hero">
        <div className="page-title">
          <span>Take Action</span>
          <h1>How can we fight Amazon's decision?</h1>
          <p>
            First, sign the petitions to show that plenty of fans are still here. Then reach out to Amazon and the
            public contacts connected to the decision. Whether you have ten seconds or ten minutes, every action can
            make a difference.
          </p>
        </div>
        <div className="help-quick-nav" aria-label="Campaign action sections">
          <a href="#petitions"><CheckCircle2 size={17} /> Sign petitions</a>
          <a href="#reach-amazon"><MessageCircle size={17} /> Reach Amazon</a>
          <a href="#contact-directory"><Building2 size={17} /> Contact directory</a>
        </div>
      </div>

      <section className="help-block" id="petitions">
        <div className="help-section-heading">
          <div>
            <span>Step one</span>
            <h2>Sign these petitions</h2>
            <p>Petitions make the fanbase visible in a way that is easy to count, share, and point back to.</p>
          </div>
        </div>
        <div className="card-grid two help-petition-grid">
          {petitions.map((petition) => <PetitionCard key={petition._id} petition={petition} />)}
          {petitions.length === 0 && <p className="empty">No petitions listed yet.</p>}
        </div>
        <div className="card fundraiser-callout">
          <div>
            <div className="card-kicker">Fan fundraiser</div>
            <h3>Help fund Save Stargate outreach</h3>
            <p>
              There is also a fan-run GoFundMe for the Save Stargate effort. Share it or chip in if you want to help
              cover campaign visibility and organizing costs.
            </p>
          </div>
          <div className="card-action-note">
            <a
              className="text-link"
              href={campaignFundraiserUrl}
              target="_blank"
              rel="noreferrer"
              {...outboundTrackingProps({
                category: "gofundme",
                label: "SaveStargate GoFundMe",
                targetUrl: campaignFundraiserUrl
              })}
            >
              Open GoFundMe <ExternalLink size={14} />
            </a>
            <p className="affiliation-note">This site is not affiliated with this GoFundMe fundraiser.</p>
          </div>
        </div>
      </section>

      <section className="help-block" id="reach-amazon">
        <div className="help-section-heading">
          <div>
            <span>Step two</span>
            <h2>Reach out to Amazon</h2>
            <p>
              We want the Martin Gero Stargate to continue: a version that honors the legacy of Stargate, cares about
              the fans, and keeps the heart of what made Stargate special.
            </p>
          </div>
        </div>
        <div className="outreach-playbook">
          <aside className="card outreach-principles">
            <div className="card-kicker">Message</div>
            <h3>Keep it short, specific, and respectful.</h3>
            <p>
              Ask Amazon to continue the Martin Gero-led Stargate project, mention that the fanbase is still active,
              and explain why legacy-aware Stargate matters to you.
            </p>
            <blockquote>
              Please continue the Gero-led Stargate project. Fans are still here, and we want a new series that respects
              the franchise and its community.
            </blockquote>
          </aside>
          <div className="outreach-channel-list">
            {amazonOutreachOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <article className="card outreach-channel" key={option.title}>
                  <div className="outreach-channel-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="outreach-channel-body">
                    <div className="outreach-channel-heading">
                      <span><Icon size={20} /></span>
                      <div>
                        <div className="card-kicker">{option.label}</div>
                        <h3>{option.title}</h3>
                      </div>
                    </div>
                    <p>{option.body}</p>
                    {"address" in option && option.address && <pre>{option.address}</pre>}
                    <ul>
                      {option.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
                    </ul>
                    {"actions" in option && option.actions && (
                      <div className="button-row">
                        {option.actions.map((action) => (
                        <a
                          className="secondary-button small"
                          href={action.href}
                          key={action.href}
                          target={action.href.startsWith("http") ? "_blank" : undefined}
                          rel={action.href.startsWith("http") ? "noreferrer" : undefined}
                          {...outboundTrackingProps({
                            category: "contact",
                            label: action.label,
                            targetUrl: action.href
                          })}
                        >
                            {action.label} <ExternalLink size={14} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="help-block" id="contact-directory">
        <div className="help-section-heading">
          <div>
            <span>Step three</span>
            <h2>Contact directory</h2>
            <p>Companies and people connected to the decision. Use public and work channels respectfully.</p>
          </div>
        </div>
        <div className="card suggestion-callout">
          <div>
            <h3>Know a contact we missed?</h3>
            <p>Send a source, profile, work email, or company page. It will sit in review before it appears.</p>
          </div>
          <SuggestionForm buttonLabel="Suggest new contact" />
        </div>
        <div className="section-heading"><span><Landmark size={17} /> Studios and companies</span></div>
        <div className="card-grid two contact-section">
          {entities.map((contact) => <ContactCard key={contact._id} contact={contact} />)}
        </div>
        <div className="section-heading contact-heading"><span><BriefcaseBusiness size={17} /> People</span></div>
        <div className="card-grid two contact-section">
          {people.map((contact) => <ContactCard key={contact._id} contact={contact} />)}
          {people.length === 0 && <p className="empty">No individual contacts listed yet.</p>}
        </div>
      </section>
    </section>
  );
};
