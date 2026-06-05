import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { Model } from "mongoose";
import {
  communityTopicSchema,
  contactTargetSchema,
  inviteUserSchema,
  moderateCommentSchema,
  moderateFanMessageSchema,
  petitionSchema,
  reviewContactSuggestionSchema,
  reviewContactMessageSchema,
  resourceLinkSchema,
  testEmailSchema,
  updatePostSchema,
  updateUserSchema
} from "../../../shared/src/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getRequestBaseUrl } from "../utils/requestUrl.js";
import { hasRole, canManageRole } from "../auth/permissions.js";
import { slugify } from "../utils/slug.js";
import { audit } from "../services/audit.js";
import { createEmailVerificationLink, createInviteLink } from "../services/authTokens.js";
import { isEmailConfigured, sendTestEmail, verifyEmailSettings } from "../services/email.js";
import { isProduction } from "../config.js";
import { syncOnePetition } from "../services/petitionSync.js";
import { Comment } from "../models/Comment.js";
import { CommunityTopic } from "../models/CommunityTopic.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { ContactTarget } from "../models/ContactTarget.js";
import { ContactSuggestion } from "../models/ContactSuggestion.js";
import { FanMessage } from "../models/FanMessage.js";
import { LoginToken } from "../models/LoginToken.js";
import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";
import { ResourceLink } from "../models/ResourceLink.js";
import { SiteTraffic } from "../models/SiteTraffic.js";
import { UpdatePost } from "../models/UpdatePost.js";
import { User } from "../models/User.js";
import { AuditEvent } from "../models/AuditEvent.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("moderator"));

const makeSlug = (body: { title?: string; slug?: string }) => body.slug || slugify(body.title ?? "");
const contactUploadsDir = path.resolve(process.cwd(), "uploads", "contacts");
const contactImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);
const contactImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const getContactImageExtension = (file: Express.Multer.File) => {
  const extension = path.extname(file.originalname).toLowerCase();
  return contactImageTypes.get(file.mimetype) ?? (contactImageExtensions.has(extension) ? extension.replace(".jpeg", ".jpg") : "");
};
const contactImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(contactUploadsDir, { recursive: true });
      callback(null, contactUploadsDir);
    },
    filename: (_req, file, callback) => {
      const extension = getContactImageExtension(file);
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!getContactImageExtension(file)) {
      callback(new Error("Use a JPG, PNG, WebP, or GIF image."));
      return;
    }
    callback(null, true);
  }
});
const uploadContactImageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  contactImageUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 4MB or smaller."
        : error instanceof Error
          ? error.message
          : "Image upload failed";
    res.status(400).json({ error: message });
  });
};

const crudRoutes = (options: {
  path: string;
  model: Model<any>;
  schema: any;
  entityType: string;
  minimumRole?: "admin" | "moderator";
  beforeSave?: (body: any, req: any, existing?: any) => Promise<any> | any;
  afterSave?: (item: any, req: any, existing?: any) => Promise<void> | void;
}) => {
  const router = Router();
  const minimumRole = options.minimumRole ?? "admin";

  router.get(
    "/",
    asyncRoute(async (_req, res) => {
      const items = await options.model.find().sort({ createdAt: -1 }).limit(200);
      res.json({ items });
    })
  );

  router.post(
    "/",
    requireRole(minimumRole),
    validateBody(options.schema),
    asyncRoute(async (req, res) => {
      const body = await options.beforeSave?.(req.body, req);
      const item = await options.model.create(body ?? req.body);
      await options.afterSave?.(item, req);
      await audit(req, "create", options.entityType, item._id);
      res.status(201).json({ item });
    })
  );

  router.put(
    "/:id",
    requireRole(minimumRole),
    validateBody(options.schema),
    asyncRoute(async (req, res) => {
      const existing = await options.model.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      const body = await options.beforeSave?.(req.body, req, existing);
      const previous = existing.toObject();
      Object.assign(existing, body ?? req.body);
      await existing.save();
      await options.afterSave?.(existing, req, previous);
      await audit(req, "update", options.entityType, existing._id);
      res.json({ item: existing });
    })
  );

  router.delete(
    "/:id",
    requireRole(minimumRole),
    asyncRoute(async (req, res) => {
      const item = await options.model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      await audit(req, "delete", options.entityType, item._id);
      res.json({ ok: true });
    })
  );

  adminRouter.use(options.path, router);
};

adminRouter.get(
  "/dashboard",
  asyncRoute(async (_req, res) => {
    const since7 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString().slice(0, 10);
    const [petitionCount, failedSyncs, reportedComments, hiddenComments, draftUpdates, recentComments, newContactMessages, pendingFanMessages, traffic7Days] = await Promise.all([
      Petition.countDocuments({ status: "active" }),
      Petition.countDocuments({ syncStatus: "failed" }),
      Comment.countDocuments({ reportCount: { $gt: 0 }, status: "visible" }),
      Comment.countDocuments({ status: "hidden" }),
      UpdatePost.countDocuments({ status: "draft" }),
      Comment.find().sort({ createdAt: -1 }).limit(8).populate("authorId", "email displayName"),
      ContactMessage.countDocuments({ status: "new" }),
      FanMessage.countDocuments({ status: "pending" }),
      SiteTraffic.aggregate([{ $match: { dateKey: { $gte: since7 } } }, { $group: { _id: null, views: { $sum: "$views" } } }])
    ]);
    const pendingContactSuggestions = await ContactSuggestion.countDocuments({ status: "pending" });
    res.json({
      petitionCount,
      failedSyncs,
      reportedComments,
      hiddenComments,
      draftUpdates,
      recentComments,
      pendingContactSuggestions,
      newContactMessages,
      pendingFanMessages,
      traffic7Days: traffic7Days[0]?.views ?? 0
    });
  })
);

adminRouter.post(
  "/uploads/contact-image",
  requireRole("admin"),
  uploadContactImageMiddleware,
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Image is required" });
    const imageUrl = `/uploads/contacts/${req.file.filename}`;
    await audit(req, "upload-contact-image", "contact-image", undefined, { fileName: req.file.filename, imageUrl });
    res.status(201).json({ imageUrl, fileName: req.file.filename });
  })
);

adminRouter.get(
  "/traffic",
  asyncRoute(async (_req, res) => {
    const since30 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString().slice(0, 10);
    const docs = await SiteTraffic.find({ dateKey: { $gte: since30 } }).sort({ dateKey: -1, views: -1 }).lean();
    const totals = docs.reduce(
      (acc, item) => {
        acc.views += item.views ?? 0;
        for (const visitor of item.visitorHashes ?? []) acc.visitors.add(visitor);
        return acc;
      },
      { views: 0, visitors: new Set<string>() }
    );
    const byDay = [...docs.reduce((map, item) => {
      const current = map.get(item.dateKey) ?? { dateKey: item.dateKey, views: 0, visitors: new Set<string>() };
      current.views += item.views ?? 0;
      for (const visitor of item.visitorHashes ?? []) current.visitors.add(visitor);
      map.set(item.dateKey, current);
      return map;
    }, new Map<string, { dateKey: string; views: number; visitors: Set<string> }>()).values()]
      .map((item) => ({ dateKey: item.dateKey, views: item.views, visitors: item.visitors.size }))
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
    const byPath = [...docs.reduce((map, item) => {
      const lastSeenAt = item.lastSeenAt ? new Date(item.lastSeenAt) : undefined;
      const current = map.get(item.path) ?? { path: item.path, views: 0, visitors: new Set<string>(), lastSeenAt };
      current.views += item.views ?? 0;
      for (const visitor of item.visitorHashes ?? []) current.visitors.add(visitor);
      if (!current.lastSeenAt || (lastSeenAt && lastSeenAt > current.lastSeenAt)) current.lastSeenAt = lastSeenAt;
      map.set(item.path, current);
      return map;
    }, new Map<string, { path: string; views: number; visitors: Set<string>; lastSeenAt?: Date }>()).values()]
      .map((item) => ({ path: item.path, views: item.views, visitors: item.visitors.size, lastSeenAt: item.lastSeenAt }))
      .sort((left, right) => right.views - left.views)
      .slice(0, 20);

    res.json({ totalViews: totals.views, totalVisitors: totals.visitors.size, byDay, byPath });
  })
);

crudRoutes({
  path: "/updates",
  model: UpdatePost,
  schema: updatePostSchema,
  entityType: "update",
  beforeSave: (body, req) => ({
    ...body,
    slug: makeSlug(body),
    publishedAt: body.status === "published" ? body.publishedAt ?? new Date() : body.publishedAt,
    createdBy: req.user._id,
    updatedBy: req.user._id
  })
});

crudRoutes({
  path: "/petitions",
  model: Petition,
  schema: petitionSchema,
  entityType: "petition",
  beforeSave: async (body, _req, existing) => {
    return {
      ...body,
      syncStatus: body.syncDisabledReason ? "disabled" : existing?.syncStatus ?? "never"
    };
  },
  afterSave: async (petition, _req, previous) => {
    if (!previous || previous.currentCount !== petition.currentCount || previous.goalCount !== petition.goalCount) {
      await PetitionSnapshot.create({
        petitionId: petition._id,
        count: petition.currentCount,
        goal: petition.goalCount,
        source: "manual"
      });
    }
  }
});

adminRouter.post(
  "/petitions/:id/sync",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const petitionId = String(req.params.id);
    const petition = await syncOnePetition(petitionId);
    await audit(req, "sync", "petition", petitionId);
    res.json({ petition });
  })
);

crudRoutes({
  path: "/contacts",
  model: ContactTarget,
  schema: contactTargetSchema,
  entityType: "contact-target"
});

adminRouter.get(
  "/contact-suggestions",
  requireRole("moderator"),
  asyncRoute(async (_req, res) => {
    const suggestions = await ContactSuggestion.find()
      .populate("contactTargetId", "name kind organization links")
      .sort({ status: 1, createdAt: -1 })
      .limit(200);
    res.json({ suggestions });
  })
);

adminRouter.patch(
  "/contact-suggestions/:id",
  requireRole("admin"),
  validateBody(reviewContactSuggestionSchema),
  asyncRoute(async (req, res) => {
    const suggestion = await ContactSuggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });

    suggestion.status = req.body.status;
    suggestion.adminNote = req.body.adminNote;
    suggestion.reviewedBy = req.user!._id;
    suggestion.reviewedAt = new Date();

    if (req.body.status === "approved") {
      const link = {
        label: suggestion.suggestedLabel,
        type: suggestion.suggestedType,
        url: suggestion.suggestedUrl
      };

      if (suggestion.contactTargetId) {
        const target = await ContactTarget.findById(suggestion.contactTargetId);
        if (target && !target.links?.some((existing: any) => existing.url === link.url)) {
          target.links.push(link);
          await target.save();
        }
      } else {
        await ContactTarget.create({
          name: suggestion.targetName,
          kind: suggestion.kind,
          organization: suggestion.kind === "person" ? "" : suggestion.targetName,
          role: suggestion.kind === "person" ? "Suggested contact" : "Suggested entity",
          publicContactUrl: suggestion.suggestedUrl,
          sourceUrl: suggestion.suggestedUrl,
          links: [link],
          priority: 4,
          suggestedMessage: "Please look at the current petition and support a new Stargate series.",
          notes: suggestion.notes,
          status: "draft"
        });
      }
    }

    await suggestion.save();
    await audit(req, `contact-suggestion-${req.body.status}`, "contact-suggestion", suggestion._id);
    res.json({ suggestion });
  })
);

adminRouter.get(
  "/contact-messages",
  requireRole("moderator"),
  asyncRoute(async (_req, res) => {
    const messages = await ContactMessage.find().populate("reviewedBy", "email displayName").sort({ status: 1, createdAt: -1 }).limit(300);
    res.json({ messages });
  })
);

adminRouter.patch(
  "/contact-messages/:id",
  requireRole("moderator"),
  validateBody(reviewContactMessageSchema),
  asyncRoute(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    message.status = req.body.status;
    message.adminNote = req.body.adminNote;
    message.reviewedBy = req.user!._id;
    message.reviewedAt = new Date();
    await message.save();

    await audit(req, "review-contact-message", "contact-message", message._id, { status: req.body.status });
    res.json({ message });
  })
);

adminRouter.delete(
  "/contact-messages/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });
    await audit(req, "delete-contact-message", "contact-message", message._id);
    res.json({ ok: true });
  })
);

crudRoutes({
  path: "/topics",
  model: CommunityTopic,
  schema: communityTopicSchema,
  entityType: "community-topic",
  beforeSave: (body, req) => ({
    ...body,
    slug: makeSlug(body),
    createdBy: req.user._id
  })
});

crudRoutes({
  path: "/resources",
  model: ResourceLink,
  schema: resourceLinkSchema,
  entityType: "resource-link"
});

adminRouter.get(
  "/moderation/comments",
  asyncRoute(async (_req, res) => {
    const comments = await Comment.find({
      $or: [{ reportCount: { $gt: 0 } }, { status: { $ne: "visible" } }]
    })
      .populate("authorId", "email displayName status")
      .sort({ reportCount: -1, updatedAt: -1 })
      .limit(200);
    res.json({ comments });
  })
);

adminRouter.get(
  "/fan-messages",
  asyncRoute(async (_req, res) => {
    const messages = await FanMessage.find()
      .populate("authorId", "email displayName")
      .sort({ status: 1, createdAt: -1 })
      .limit(300);
    res.json({ messages });
  })
);

adminRouter.patch(
  "/fan-messages/:id",
  requireRole("moderator"),
  validateBody(moderateFanMessageSchema),
  asyncRoute(async (req, res) => {
    const message = await FanMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!message) return res.status(404).json({ error: "Fan message not found" });
    await audit(req, "moderate-fan-message", "fanMessage", message._id, { status: req.body.status });
    res.json({ message });
  })
);

adminRouter.delete(
  "/fan-messages/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const message = await FanMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ error: "Fan message not found" });
    await audit(req, "delete-fan-message", "fanMessage", message._id);
    res.json({ ok: true });
  })
);

adminRouter.patch(
  "/moderation/comments/:id",
  validateBody(moderateCommentSchema),
  asyncRoute(async (req, res) => {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    await audit(req, "moderate-comment", "comment", comment._id, { status: req.body.status });
    res.json({ comment });
  })
);

adminRouter.get(
  "/users",
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    const users = await User.find().select("-passwordHash").sort({ role: 1, email: 1 }).limit(300);
    res.json({ users });
  })
);

adminRouter.post(
  "/email/test",
  requireRole("admin"),
  validateBody(testEmailSchema),
  asyncRoute(async (req, res) => {
    if (!isEmailConfigured()) {
      return res.status(400).json({ error: "SMTP is not configured for this environment" });
    }

    await verifyEmailSettings();
    await sendTestEmail(req.body.email);
    await audit(req, "send-test-email", "email", undefined, { to: req.body.email });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/users/invites",
  requireRole("admin"),
  validateBody(inviteUserSchema),
  asyncRoute(async (req, res) => {
    if (!canManageRole(req.user!.role, req.body.role)) return res.status(403).json({ error: "Cannot invite that role" });
    const user = await User.findOneAndUpdate(
      { email: req.body.email },
      {
        email: req.body.email,
        role: req.body.role,
        status: "invited",
        invitedBy: req.user!._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const invite = await createInviteLink({ email: req.body.email, role: req.body.role, invitedBy: req.user!._id, baseUrl: getRequestBaseUrl(req) });
    await audit(req, "invite", "user", user._id, { role: req.body.role });
    const data = user.toObject();
    delete data.passwordHash;
    res.status(201).json({ user: data, inviteLink: invite.link, expiresAt: invite.expiresAt });
  })
);

adminRouter.post(
  "/users/:id/resend-verification",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "user" || user.status !== "pending") {
      return res.status(400).json({ error: "Only pending public users can be verified this way" });
    }

    const verification = await createEmailVerificationLink(user.email, getRequestBaseUrl(req));
    await audit(req, "resend-verification", "user", user._id);
    res.json({ ok: true, verificationLink: isProduction || isEmailConfigured() ? undefined : verification.link });
  })
);

adminRouter.patch(
  "/users/:id",
  requireRole("admin"),
  validateBody(updateUserSchema),
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.body.role && !canManageRole(req.user!.role, req.body.role)) {
      return res.status(403).json({ error: "Cannot assign that role" });
    }
    if (!hasRole(req.user!.role, user.role) || user.role === "owner") {
      return res.status(403).json({ error: "Cannot modify that user" });
    }
    Object.assign(user, req.body);
    await user.save();
    await audit(req, "update-user", "user", user._id, req.body);
    const data = user.toObject();
    delete data.passwordHash;
    res.json({ user: data });
  })
);

adminRouter.delete(
  "/users/:id",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (String(user._id) === String(req.user!._id)) {
      return res.status(400).json({ error: "You cannot delete your own account here" });
    }
    if (!hasRole(req.user!.role, user.role) || user.role === "owner") {
      return res.status(403).json({ error: "Cannot delete that user" });
    }

    await audit(req, "delete-user", "user", user._id, { email: user.email, role: user.role, status: user.status });
    await Promise.all([
      Comment.deleteMany({ authorId: user._id }),
      Comment.updateMany({ "reports.userId": user._id }, { $pull: { reports: { userId: user._id } } }),
      FanMessage.updateMany({ authorId: user._id }, { $unset: { authorId: "" }, $set: { anonymous: true } }),
      LoginToken.deleteMany({ email: user.email }),
      user.deleteOne()
    ]);
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/audit",
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    const events = await AuditEvent.find().populate("actorId", "email displayName").sort({ createdAt: -1 }).limit(200);
    res.json({ events });
  })
);

adminRouter.post(
  "/petitions/:id/snapshot",
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const petition = await Petition.findById(req.params.id);
    if (!petition) return res.status(404).json({ error: "Petition not found" });
    const snapshot = await PetitionSnapshot.create({
      petitionId: petition._id,
      count: petition.currentCount,
      goal: petition.goalCount,
      source: "manual"
    });
    res.status(201).json({ snapshot });
  })
);
