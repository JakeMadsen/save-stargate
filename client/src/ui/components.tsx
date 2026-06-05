import { AlertCircle, CheckCircle2, ExternalLink, Flag, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { postJson } from "../api.js";
import { useAuth } from "./AuthContext.js";

export type Petition = {
  _id: string;
  title: string;
  url: string;
  description: string;
  imageUrl?: string;
  status: string;
  currentCount: number;
  goalCount: number;
  latestUpdateTitle?: string;
  latestUpdateBody?: string;
  latestUpdateAt?: string;
  displayOrder?: number;
  lastSyncedAt?: string;
  syncStatus?: string;
};

export type UpdatePost = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  pinned: boolean;
  allowComments?: boolean;
  publishedAt?: string;
  createdAt: string;
};

export type Comment = {
  _id: string;
  body: string;
  status: string;
  reportCount: number;
  createdAt: string;
  authorId?: { email?: string; displayName?: string };
};

const formatCount = (value: number) => value.toLocaleString("en-US");
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
const petitionStatusLabel = (status?: string) => {
  if (status === "failed" || status === "disabled") return "Manual count";
  if (status === "ok") return "Live count";
  return "Tracked petition";
};

export const ProgressBar = ({ current, goal }: { current: number; goal: number }) => {
  const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  return (
    <div className="progress-wrap" aria-label={`${percent}% of goal`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  );
};

export const PetitionCard = ({ petition }: { petition: Petition }) => (
  <article className="card petition-card">
    <div className="card-kicker">{petitionStatusLabel(petition.syncStatus)}</div>
    <h3>{petition.title}</h3>
    {petition.imageUrl && (
      <div className="petition-card-image">
        <img src={petition.imageUrl} alt="" loading="lazy" />
      </div>
    )}
    <p>{petition.description}</p>
    {petition.goalCount > 0 && <ProgressBar current={petition.currentCount} goal={petition.goalCount} />}
    <div className="metric-row">
      <strong>{formatCount(petition.currentCount)}</strong>
      <span>{petition.goalCount > 0 ? `of ${formatCount(petition.goalCount)} signatures` : "verified signatures"}</span>
    </div>
    {(petition.latestUpdateTitle || petition.latestUpdateBody) && (
      <div className="petition-latest-update">
        <span>Latest petition update</span>
        {petition.latestUpdateTitle && <strong>{petition.latestUpdateTitle}</strong>}
        {petition.latestUpdateAt && <small>{formatDate(petition.latestUpdateAt)}</small>}
        {petition.latestUpdateBody && <p>{petition.latestUpdateBody}</p>}
      </div>
    )}
    <a className="text-link" href={petition.url} target="_blank" rel="noreferrer">
      Open petition <ExternalLink size={14} />
    </a>
  </article>
);

export const UpdateCard = ({ update }: { update: UpdatePost }) => (
  <article className="card update-card">
    <div className="card-kicker">{update.pinned ? "Pinned update" : "Campaign update"}</div>
    <h3>
      <Link to={`/updates/${update.slug}`}>{update.title}</Link>
    </h3>
    <p>{update.summary}</p>
    <div className="tag-row">
      {(update.tags ?? []).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  </article>
);

const updatePreview = (markdown: string) => {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !block.startsWith("# "));
  return blocks.slice(0, 4).join("\n\n");
};

export const FeaturedUpdateCard = ({ update }: { update: UpdatePost }) => (
  <article className="card featured-update-card">
    <div className="card-kicker">{update.pinned ? "Pinned update" : "Campaign update"}</div>
    <h2>
      <Link to={`/updates/${update.slug}`}>{update.title}</Link>
    </h2>
    <p className="lede">{update.summary}</p>
    <div className="update-feature-body">
      <MarkdownView markdown={updatePreview(update.bodyMarkdown) || update.summary} />
    </div>
    <div className="featured-update-footer">
      <div className="tag-row">
        {(update.tags ?? []).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <Link className="text-link" to={`/updates/${update.slug}`}>
        Read full update
      </Link>
    </div>
  </article>
);

export const MarkdownView = ({ markdown }: { markdown: string }) => (
  <div className="markdown-view">
    {markdown.split(/\n{2,}/).map((block, index) => {
      if (block.startsWith("# ")) return <h2 key={index}>{block.replace(/^#\s+/, "")}</h2>;
      if (block.startsWith("## ")) return <h3 key={index}>{block.replace(/^##\s+/, "")}</h3>;
      if (block.startsWith("- ")) {
        return (
          <ul key={index}>
            {block.split("\n").map((line) => (
              <li key={line}>{line.replace(/^-\s+/, "")}</li>
            ))}
          </ul>
        );
      }
      return <p key={index}>{block}</p>;
    })}
  </div>
);

export const CommentThread = ({
  parentType,
  parentId,
  comments,
  onChange
}: {
  parentType: "update" | "topic";
  parentId: string;
  comments: Comment[];
  onChange: () => void;
}) => {
  const { user } = useAuth();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "");
    await postJson("/api/public/comments", { parentType, parentId, body });
    event.currentTarget.reset();
    onChange();
  };

  const report = async (id: string) => {
    await postJson(`/api/public/comments/${id}/report`, { reason: "Needs moderator review" });
    onChange();
  };

  return (
    <section className="comment-section">
      <h2><MessageSquare size={20} /> Comments</h2>
      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <textarea name="body" required minLength={2} maxLength={2500} placeholder="Write a comment..." />
          <button type="submit">Post comment</button>
        </form>
      ) : (
        <p className="notice">
          <AlertCircle size={16} /> <Link to="/login">Log in</Link> or <Link to="/signup">sign up</Link> to comment.
        </p>
      )}
      <div className="comment-list">
        {comments.map((comment) => (
          <article className="comment" key={comment._id}>
            <div>
              <strong>{comment.authorId?.displayName || comment.authorId?.email || "Gate supporter"}</strong>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p>{comment.body}</p>
            {user && (
              <button type="button" className="ghost-button" onClick={() => report(comment._id)}>
                <Flag size={14} /> Report
              </button>
            )}
          </article>
        ))}
        {comments.length === 0 && <p className="empty"><CheckCircle2 size={16} /> No comments yet.</p>}
      </div>
    </section>
  );
};
