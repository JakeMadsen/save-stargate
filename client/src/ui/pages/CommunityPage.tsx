import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { CommentThread, MarkdownView, type Comment } from "../components.js";
import { Seo } from "../Seo.js";

type Topic = {
  _id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  pinned: boolean;
  createdAt: string;
};

export const CommunityPage = () => {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    api<{ topics: Topic[] }>("/api/public/community").then((data) => setTopics(data.topics));
  }, []);

  return (
    <section className="page-section">
      <Seo
        title="Fan Discussion"
        description="Save The Gate community topics for Stargate fans coordinating ideas, links, comments, and campaign action."
        path="/community"
      />
      <div className="page-title">
        <span>Community</span>
        <h1>Fan Discussion</h1>
        <p>Talk through ideas, share useful links, and keep the effort practical.</p>
      </div>
      <div className="card-grid two">
        {topics.map((topic) => (
          <article className="card" key={topic._id}>
            <div className="card-kicker"><MessageSquare size={15} /> {topic.pinned ? "Pinned topic" : "Topic"}</div>
            <h3><Link to={`/community/${topic.slug}`}>{topic.title}</Link></h3>
            <MarkdownView markdown={topic.bodyMarkdown.slice(0, 220)} />
          </article>
        ))}
        {topics.length === 0 && <p className="empty">No published topics yet.</p>}
      </div>
    </section>
  );
};

export const CommunityDetailPage = () => {
  const { slug } = useParams();
  const [data, setData] = useState<{ topic: Topic; comments: Comment[] } | null>(null);
  const load = () => api<{ topic: Topic; comments: Comment[] }>(`/api/public/community/${slug}`).then(setData);

  useEffect(() => {
    load();
  }, [slug]);

  if (!data) return <section className="page-section"><p className="empty">Loading topic...</p></section>;

  return (
    <section className="article-layout">
      <Seo
        title={data.topic.title}
        description="A Save The Gate community discussion topic for Stargate fans."
        path={`/community/${data.topic.slug}`}
      />
      <Link className="text-link" to="/community">Back to community</Link>
      <article className="article">
        <div className="card-kicker">Community topic</div>
        <h1>{data.topic.title}</h1>
        <MarkdownView markdown={data.topic.bodyMarkdown} />
      </article>
      <CommentThread parentType="topic" parentId={data.topic._id} comments={data.comments} onChange={load} />
    </section>
  );
};
