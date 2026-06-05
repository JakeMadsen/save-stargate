import { createHash } from "node:crypto";
import { type NextFunction, type Request, type Response, Router } from "express";
import { commentSchema, contactMessageSchema, contactSuggestionSchema, reportCommentSchema } from "../../../shared/src/index.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { Comment } from "../models/Comment.js";
import { CommunityTopic } from "../models/CommunityTopic.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { ContactTarget } from "../models/ContactTarget.js";
import { ContactSuggestion } from "../models/ContactSuggestion.js";
import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";
import { ResourceLink } from "../models/ResourceLink.js";
import { UpdatePost } from "../models/UpdatePost.js";

export const publicRouter = Router();

const published = { status: "published" };
const suggestionAttempts = new Map<string, { count: number; resetAt: number }>();
const messageAttempts = new Map<string, { count: number; resetAt: number }>();

const limitAttempts = (store: Map<string, { count: number; resetAt: number }>, maxAttempts: number, error: string) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = store.get(key);
  const windowMs = 60 * 60 * 1000;

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= maxAttempts) {
    return res.status(429).json({ error });
  }

  current.count += 1;
  return next();
};
const limitContactSuggestions = limitAttempts(suggestionAttempts, 5, "Too many suggestions. Please try again later.");
const limitContactMessages = limitAttempts(messageAttempts, 3, "Too many messages. Please try again later.");
const hashIp = (value?: string) => (value ? createHash("sha256").update(value).digest("hex") : undefined);

publicRouter.get(
  "/home",
  asyncRoute(async (_req, res) => {
    const [latestUpdate, pinnedUpdate, petitions, contacts, resources] = await Promise.all([
      UpdatePost.findOne(published).sort({ publishedAt: -1, createdAt: -1 }),
      UpdatePost.findOne({ ...published, pinned: true }).sort({ publishedAt: -1, createdAt: -1 }),
      Petition.find({ status: "active" }).sort({ displayOrder: 1, currentCount: -1 }).limit(4),
      ContactTarget.find(published).sort({ priority: 1, createdAt: -1 }).limit(3),
      ResourceLink.find(published).sort({ priority: 1, createdAt: -1 }).limit(4)
    ]);

    res.json({ latestUpdate, pinnedUpdate, petitions, contacts, resources });
  })
);

publicRouter.get(
  "/updates",
  asyncRoute(async (_req, res) => {
    const updates = await UpdatePost.find(published).sort({ pinned: -1, publishedAt: -1, createdAt: -1 });
    res.json({ updates });
  })
);

publicRouter.get(
  "/updates/:slug",
  asyncRoute(async (req, res) => {
    const update = await UpdatePost.findOne({ slug: req.params.slug, ...published });
    if (!update) return res.status(404).json({ error: "Update not found" });
    const comments = await Comment.find({ parentType: "update", parentId: update._id, status: "visible" })
      .populate("authorId", "displayName email")
      .sort({ createdAt: 1 });
    res.json({ update, comments });
  })
);

publicRouter.get(
  "/petitions",
  asyncRoute(async (_req, res) => {
    const petitions = await Petition.find({ status: { $ne: "archived" } }).sort({ displayOrder: 1, currentCount: -1 });
    res.json({ petitions });
  })
);

publicRouter.get(
  "/petitions/:id/snapshots",
  asyncRoute(async (req, res) => {
    const snapshots = await PetitionSnapshot.find({ petitionId: req.params.id }).sort({ capturedAt: 1 }).limit(120);
    res.json({ snapshots });
  })
);

publicRouter.get(
  "/contacts",
  asyncRoute(async (_req, res) => {
    const contacts = await ContactTarget.find(published).sort({ priority: 1, createdAt: -1 });
    res.json({ contacts });
  })
);

publicRouter.post(
  "/contact-suggestions",
  limitContactSuggestions,
  validateBody(contactSuggestionSchema),
  asyncRoute(async (req, res) => {
    const suggestion = await ContactSuggestion.create({
      ...req.body,
      status: "pending"
    });
    res.status(201).json({ suggestion });
  })
);

publicRouter.post(
  "/contact-messages",
  limitContactMessages,
  validateBody(contactMessageSchema),
  asyncRoute(async (req, res) => {
    if (req.body.website) return res.status(204).send();

    const message = await ContactMessage.create({
      name: req.body.name,
      email: req.body.email || undefined,
      subject: req.body.subject,
      category: req.body.category,
      message: req.body.message,
      status: "new",
      ipHash: hashIp(req.ip),
      userAgent: req.get("user-agent")?.slice(0, 300)
    });
    res.status(201).json({ message });
  })
);

publicRouter.get(
  "/community",
  asyncRoute(async (_req, res) => {
    const topics = await CommunityTopic.find(published).sort({ pinned: -1, createdAt: -1 });
    res.json({ topics });
  })
);

publicRouter.get(
  "/community/:slug",
  asyncRoute(async (req, res) => {
    const topic = await CommunityTopic.findOne({ slug: req.params.slug, ...published });
    if (!topic) return res.status(404).json({ error: "Topic not found" });
    const comments = await Comment.find({ parentType: "topic", parentId: topic._id, status: "visible" })
      .populate("authorId", "displayName email")
      .sort({ createdAt: 1 });
    res.json({ topic, comments });
  })
);

publicRouter.get(
  "/resources",
  asyncRoute(async (_req, res) => {
    const resources = await ResourceLink.find(published).sort({ priority: 1, type: 1, title: 1 });
    res.json({ resources });
  })
);

publicRouter.post(
  "/comments",
  requireAuth,
  validateBody(commentSchema),
  asyncRoute(async (req, res) => {
    const comment = await Comment.create({
      ...req.body,
      authorId: req.user!._id,
      status: "visible"
    });
    res.status(201).json({ comment });
  })
);

publicRouter.post(
  "/comments/:id/report",
  requireAuth,
  validateBody(reportCommentSchema),
  asyncRoute(async (req, res) => {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { reportCount: 1 },
        $push: { reports: { userId: req.user!._id, reason: req.body.reason } }
      },
      { new: true }
    );
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    res.json({ comment });
  })
);
