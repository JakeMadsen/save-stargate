import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api.js";

type Resource = {
  _id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  tags: string[];
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
      <div className="card-grid three">
        {resources.map((resource) => (
          <article className="card" key={resource._id}>
            <div className="card-kicker">{resource.type}</div>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <div className="tag-row">{resource.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <a className="text-link" href={resource.url} target="_blank" rel="noreferrer">
              Visit <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};
