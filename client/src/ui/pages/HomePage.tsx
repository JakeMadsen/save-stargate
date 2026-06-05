import { ArrowRight, Megaphone, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import heroImage from "../../assets/banner.jpg";
import { PetitionCard, UpdateCard, type Petition, type UpdatePost } from "../components.js";

type HomeData = {
  latestUpdate?: UpdatePost | null;
  pinnedUpdate?: UpdatePost | null;
  petitions: Petition[];
  contacts: Array<{ _id: string; name: string; kind?: "entity" | "person"; organization: string; role: string; publicContactUrl: string; imageUrl?: string }>;
  resources: Array<{ _id: string; title: string; type: string; url: string }>;
};

const contactAnchor = (contact: { _id: string }) => `/contacts#contact-${contact._id}`;

export const HomePage = () => {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    api<HomeData>("/api/public/home").then(setData);
  }, []);

  return (
    <>
      <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(4,10,14,.96), rgba(4,10,14,.74) 42%, rgba(4,10,14,.2)), url(${heroImage})` }}>
        <div className="hero-copy">
          <div className="eyebrow"><Megaphone size={18} /> Stargate fans are organizing</div>
          <h1>Save The Gate</h1>
          <p>
            Amazon is walking away from new Stargate before it even gets a chance. Sign the petition, use the contact list,
            and help show there is still an audience here.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/petitions">
              Sign the petitions <ArrowRight size={18} />
            </Link>
            <Link className="secondary-button" to="/community">
              Join the discussion
            </Link>
          </div>
        </div>
      </section>

      <section className="action-band">
        <div>
          <Target size={22} />
          <strong>Watch the numbers</strong>
          <span>Live petition counts and older fan campaigns in one place.</span>
        </div>
        <div>
          <Users size={22} />
          <strong>Find contacts</strong>
          <span>Public company profiles, work emails, and professional links.</span>
        </div>
        <div>
          <Megaphone size={22} />
          <strong>Follow updates</strong>
          <span>New posts, contact changes, and useful next steps.</span>
        </div>
      </section>

      <section className="section-grid">
        <div>
          <div className="section-heading">
            <span>Current petitions</span>
            <Link to="/petitions">View all</Link>
          </div>
          <div className="card-grid two">
            {(data?.petitions ?? []).map((petition) => <PetitionCard key={petition._id} petition={petition} />)}
          </div>
        </div>
        <aside className="signal-panel">
          <div className="section-heading">
            <span>Latest update</span>
            <Link to="/updates">Feed</Link>
          </div>
          {data?.pinnedUpdate || data?.latestUpdate ? (
            <UpdateCard update={(data.pinnedUpdate || data.latestUpdate)!} />
          ) : (
            <p className="empty">No campaign updates yet.</p>
          )}
        </aside>
      </section>

      <section className="content-band">
        <div className="section-heading">
          <span>People to contact</span>
          <Link to="/contacts">Full list</Link>
        </div>
        <div className="card-grid three">
          {(data?.contacts ?? []).map((contact) => (
            <Link className="card clickable-card" key={contact._id} to={contactAnchor(contact)}>
              {contact.imageUrl && (
                <div className={`home-contact-image ${contact.kind === "entity" ? "logo-image" : ""}`}>
                  <img src={contact.imageUrl} alt={contact.name} loading="lazy" />
                </div>
              )}
              <div className="card-kicker">{contact.organization}</div>
              <h3>{contact.name}</h3>
              <p>{contact.role}</p>
              <span className="text-link">View contact details</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
};
