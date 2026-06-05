import {
  BriefcaseBusiness,
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
import { api } from "../../api.js";

type ResourceLinkType =
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

type ResourceLink = {
  label: string;
  type: ResourceLinkType;
  url: string;
};

type Resource = {
  _id: string;
  title: string;
  type: string;
  url?: string;
  description: string;
  tags: string[];
  links?: ResourceLink[];
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

const resourceLinks = (resource: Resource): ResourceLink[] => {
  if (resource.links?.length) return resource.links;
  if (resource.url) {
    return [{ label: "Visit", type: resource.type === "youtube" ? "youtube" : "website", url: resource.url }];
  }
  return [];
};

export const ResourcesPage = () => {
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    api<{ resources: Resource[] }>("/api/public/resources").then((data) => setResources(data.resources));
  }, []);

  return (
    <section className="page-section">
      <div className="page-title">
        <span>Fan links</span>
        <h1>Fan Pages and Creators</h1>
        <p>Stargate channels, sites, podcasts, and pages worth following.</p>
      </div>
      <div className="card-grid two resource-card-grid">
        {resources.map((resource) => {
          const links = resourceLinks(resource);
          return (
            <article className="card contact-card resource-card" key={resource._id}>
              <div className="card-kicker">{resource.type}</div>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              {resource.tags?.length > 0 && <div className="tag-row">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
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
            </article>
          );
        })}
        {resources.length === 0 && <p className="empty">No resources yet.</p>}
      </div>
    </section>
  );
};
