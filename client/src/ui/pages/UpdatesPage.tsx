import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { CommentThread, MarkdownView, UpdateCard, type Comment, type UpdatePost } from "../components.js";

export const UpdatesPage = () => {
  const [updates, setUpdates] = useState<UpdatePost[]>([]);

  useEffect(() => {
    api<{ updates: UpdatePost[] }>("/api/public/updates").then((data) => setUpdates(data.updates));
  }, []);

  return (
    <section className="page-section">
      <div className="page-title">
        <span>Updates</span>
        <h1>Updates</h1>
        <p>New links, petition changes, contact updates, and notes from the site.</p>
      </div>
      <div className="card-grid two">
        {updates.map((update) => <UpdateCard key={update._id} update={update} />)}
      </div>
    </section>
  );
};

export const UpdateDetailPage = () => {
  const { slug } = useParams();
  const [data, setData] = useState<{ update: UpdatePost; comments: Comment[] } | null>(null);
  const load = () => api<{ update: UpdatePost; comments: Comment[] }>(`/api/public/updates/${slug}`).then(setData);

  useEffect(() => {
    load();
  }, [slug]);

  if (!data) return <section className="page-section"><p className="empty">Loading update...</p></section>;

  return (
    <section className="article-layout">
      <Link className="text-link" to="/updates">Back to updates</Link>
      <article className="article">
        <div className="card-kicker">Campaign update</div>
        <h1>{data.update.title}</h1>
        <p className="lede">{data.update.summary}</p>
        <MarkdownView markdown={data.update.bodyMarkdown} />
      </article>
      {data.update.allowComments && (
        <CommentThread parentType="update" parentId={data.update._id} comments={data.comments} onChange={load} />
      )}
    </section>
  );
};
