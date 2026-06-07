import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Heart, Mail, Megaphone, Sparkles, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import heroImage from "../../assets/banner.jpg";
import { outboundTrackingProps } from "../../tracking.js";
import { FeaturedUpdateCard, PetitionCard, type Petition, type UpdatePost } from "../components.js";
import { Seo } from "../Seo.js";

type HomeData = {
  latestUpdate?: UpdatePost | null;
  pinnedUpdate?: UpdatePost | null;
  petitions: Petition[];
  contacts: Array<{ _id: string; name: string; kind?: "entity" | "person"; organization: string; role: string; publicContactUrl: string; imageUrl?: string }>;
  resources: Array<{ _id: string; title: string; type: string; url: string }>;
  fanMessages?: Array<{ _id: string; displayName?: string; message: string; verifiedAt?: string; createdAt: string }>;
  settings?: HomeSettings;
};

type HomeSettings = {
  homeSeoTitle: string;
  homeSeoDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  heroPrimaryLabel: string;
  heroPrimaryPath: string;
  heroSecondaryLabel: string;
  heroSecondaryPath: string;
  actionOneTitle: string;
  actionOneBody: string;
  actionTwoTitle: string;
  actionTwoBody: string;
  actionThreeTitle: string;
  actionThreeBody: string;
  campaignProducerNames: string[];
  campaignCopy: string;
  campaignHashtags: string[];
  siteInboxKicker: string;
  siteInboxTitle: string;
  siteInboxBody: string;
  siteInboxButtonLabel: string;
  latestUpdateTitle: string;
  currentPetitionsTitle: string;
  contactSectionTitle: string;
};

const defaultHomeSettings: HomeSettings = {
  homeSeoTitle: "Save The Gate",
  homeSeoDescription: "Save The Gate is a fan-run Stargate campaign tracking petitions, public contacts, updates, fan voices, and community action.",
  heroEyebrow: "Stargate fans are organizing",
  heroTitle: "Save The Gate",
  heroBody: "Amazon is walking away from new Stargate before it even gets a chance. Sign the petition, use the contact list, and help show there is still an audience here.",
  heroPrimaryLabel: "Take action",
  heroPrimaryPath: "/contacts",
  heroSecondaryLabel: "Join the discussion",
  heroSecondaryPath: "/community",
  actionOneTitle: "Watch the numbers",
  actionOneBody: "Live petition counts and older fan campaigns in one campaign flow.",
  actionTwoTitle: "Reach Amazon",
  actionTwoBody: "Support, studio phone lines, email, social channels, and public contacts.",
  actionThreeTitle: "Follow updates",
  actionThreeBody: "New posts, contact changes, and useful next steps.",
  campaignProducerNames: ["Martin Gero", "Brad Wright", "Joseph Mallozzi"],
  campaignCopy:
    "Martin Gero, Brad Wright, and Joseph Mallozzi were confirmed. That is why fans got excited. This did not sound like a random brand reboot with a Stargate label slapped on it. It sounded like the first real chance in years for someone to open the gate with people in the room who actually know what made it work.\n\nCancelling it before it had a fair shot feels absurd, so the point here is simple: keep the mistake visible. Sign the petition, use the public contact channels, and leave a fan message if Stargate meant something to you. Quiet disappointment is easy to ignore. A fanbase that keeps showing up is harder to wave away.",
  campaignHashtags: ["#SaveTheGate", "#GerosGate", "#Stargate"],
  siteInboxKicker: "Site inbox",
  siteInboxTitle: "Have something we should know?",
  siteInboxBody: "Send resources, corrections, press notes, or offers to help. Until campaign email is fully set up, messages go straight into the admin inbox here.",
  siteInboxButtonLabel: "Write us",
  latestUpdateTitle: "Latest update",
  currentPetitionsTitle: "Current petitions",
  contactSectionTitle: "Who to contact"
};

const contactAnchor = (contact: { _id: string }) => `/contacts#contact-${contact._id}`;
const campaignFundraiserUrl = "https://www.gofundme.com/f/savestargate-dont-close-the-gate";
const campaignFundraiserImage = "https://d2g8igdw686xgo.cloudfront.net/104558079_1780526554957987_r.png";

const FanVoiceCarousel = ({ messages }: { messages: NonNullable<HomeData["fanMessages"]> }) => {
  const [index, setIndex] = useState(0);
  const current = messages[index];

  useEffect(() => {
    setIndex(0);
  }, [messages]);

  useEffect(() => {
    if (messages.length < 2) return;
    const interval = window.setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % messages.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [messages.length]);

  if (!current) return null;

  const move = (direction: number) => {
    setIndex((currentIndex) => (currentIndex + direction + messages.length) % messages.length);
  };

  return (
    <section className="content-band fan-voice-band">
      <div className="section-heading">
        <span><Heart size={17} /> Fan voices</span>
        <Link to="/fan-messages">Read more</Link>
      </div>
      <div className="card fan-voice-carousel">
        <button type="button" className="icon-button" onClick={() => move(-1)} disabled={messages.length < 2} title="Previous fan voice">
          <ChevronLeft size={18} />
        </button>
        <article>
          <p>{current.message}</p>
          <div>
            <strong>{current.displayName || "A Stargate fan"}</strong>
            <span>{new Date(current.verifiedAt || current.createdAt).toLocaleDateString()}</span>
          </div>
        </article>
        <button type="button" className="icon-button" onClick={() => move(1)} disabled={messages.length < 2} title="Next fan voice">
          <ChevronRight size={18} />
        </button>
      </div>
      {messages.length > 1 && (
        <div className="carousel-dots" aria-label="Fan voice slides">
          {messages.map((message, dotIndex) => (
            <button
              key={message._id}
              type="button"
              className={dotIndex === index ? "active" : ""}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Show fan voice ${dotIndex + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export const HomePage = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const settings = { ...defaultHomeSettings, ...(data?.settings ?? {}) };
  const campaignParagraphs = settings.campaignCopy.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  useEffect(() => {
    api<HomeData>("/api/public/home").then(setData);
  }, []);

  return (
    <>
      <Seo
        title={settings.homeSeoTitle}
        description={settings.homeSeoDescription}
        path="/"
      />
      <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(4,10,14,.96), rgba(4,10,14,.74) 42%, rgba(4,10,14,.2)), url(${heroImage})` }}>
        <div className="hero-copy">
          <div className="eyebrow"><Megaphone size={18} /> {settings.heroEyebrow}</div>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroBody}</p>
          <div className="hero-actions">
            <Link className="primary-button" to={settings.heroPrimaryPath}>
              {settings.heroPrimaryLabel} <ArrowRight size={18} />
            </Link>
            <Link className="secondary-button" to={settings.heroSecondaryPath}>
              {settings.heroSecondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="action-band">
        <div>
          <Target size={22} />
          <strong>{settings.actionOneTitle}</strong>
          <span>{settings.actionOneBody}</span>
        </div>
        <div>
          <Users size={22} />
          <strong>{settings.actionTwoTitle}</strong>
          <span>{settings.actionTwoBody}</span>
        </div>
        <div>
          <Megaphone size={22} />
          <strong>{settings.actionThreeTitle}</strong>
          <span>{settings.actionThreeBody}</span>
        </div>
      </section>

      <section className="campaign-message-band">
        <div className="campaign-message-inner">
          <div className="campaign-message-copy">
            <div className="producer-strip" aria-label="Confirmed creative team">
              {settings.campaignProducerNames.map((name, index) => (
                <span key={name}>{index === 0 && <Sparkles size={15} />} {name}</span>
              ))}
            </div>
            {campaignParagraphs.map((paragraph) => (
              <p className="campaign-lede" key={paragraph}>{paragraph}</p>
            ))}
            <div className="hashtag-row" aria-label="Campaign hashtags">
              {settings.campaignHashtags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="content-band contact-cta-band">
        <div>
          <div className="card-kicker"><Mail size={16} /> {settings.siteInboxKicker}</div>
          <h2>{settings.siteInboxTitle}</h2>
          <p>{settings.siteInboxBody}</p>
        </div>
        <Link className="primary-button" to="/write-us">
          {settings.siteInboxButtonLabel} <ArrowRight size={18} />
        </Link>
      </section>

      <section className="home-priority-grid">
        <div className="home-update-panel">
          <div className="section-heading">
            <span>{settings.latestUpdateTitle}</span>
            <Link to="/updates">Feed</Link>
          </div>
          {data?.pinnedUpdate || data?.latestUpdate ? (
            <FeaturedUpdateCard update={(data.pinnedUpdate || data.latestUpdate)!} />
          ) : (
            <p className="empty">No campaign updates yet.</p>
          )}
        </div>
        <aside className="home-petition-panel">
          <div className="section-heading">
            <span>{settings.currentPetitionsTitle}</span>
            <Link to="/contacts#petitions">View all</Link>
          </div>
          <div className="card-grid">
            {(data?.petitions ?? []).map((petition) => <PetitionCard key={petition._id} petition={petition} />)}
          </div>
        </aside>
      </section>

      <section className="content-band home-fundraiser-section">
        <div className="card home-fundraiser-card">
          <img src={campaignFundraiserImage} alt="#SaveStargate banner plane" loading="lazy" />
          <div>
            <div className="card-kicker">Fan fundraiser</div>
            <h2>Support the Save Stargate campaign</h2>
            <p>
              Fans are raising money for public awareness efforts, including banner flights and other campaign visibility.
            </p>
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
        </div>
      </section>

      <section className="content-band">
        <div className="section-heading">
          <span>{settings.contactSectionTitle}</span>
          <Link to="/contacts#contact-directory">Full list</Link>
        </div>
        <div className="card-grid three">
          {(data?.contacts ?? []).map((contact) => (
            <Link className="card clickable-card" key={contact._id} to={contactAnchor(contact)}>
              <div className="card-kicker">{contact.organization}</div>
              <h3>{contact.name}</h3>
              {contact.imageUrl && (
                <div className={`home-contact-image ${contact.kind === "entity" ? "logo-image" : ""}`}>
                  <img src={contact.imageUrl} alt={contact.name} loading="lazy" />
                </div>
              )}
              <p>{contact.role}</p>
              <span className="text-link">View contact details</span>
            </Link>
          ))}
        </div>
      </section>

      {(data?.fanMessages?.length ?? 0) > 0 && <FanVoiceCarousel messages={data!.fanMessages!} />}
    </>
  );
};
