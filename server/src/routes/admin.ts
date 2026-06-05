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
  petitionSchema,
  reviewContactSuggestionSchema,
  resourceLinkSchema,
  updatePostSchema,
  updateUserSchema
} from "../../../shared/src/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { hasRole, canManageRole } from "../auth/permissions.js";
import { slugify } from "../utils/slug.js";
import { audit } from "../services/audit.js";
import { createInviteLink } from "../services/authTokens.js";
import { syncOnePetition } from "../services/petitionSync.js";
import { Comment } from "../models/Comment.js";
import { CommunityTopic } from "../models/CommunityTopic.js";
import { ContactTarget } from "../models/ContactTarget.js";
import { ContactSuggestion } from "../models/ContactSuggestion.js";
import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";
import { ResourceLink } from "../models/ResourceLink.js";
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
    const [petitionCount, failedSyncs, reportedComments, hiddenComments, draftUpdates, recentComments] = await Promise.all([
      Petition.countDocuments({ status: "active" }),
      Petition.countDocuments({ syncStatus: "failed" }),
      Comment.countDocuments({ reportCount: { $gt: 0 }, status: "visible" }),
      Comment.countDocuments({ status: "hidden" }),
      UpdatePost.countDocuments({ status: "draft" }),
      Comment.find().sort({ createdAt: -1 }).limit(8).populate("authorId", "email displayName")
    ]);
    const pendingContactSuggestions = await ContactSuggestion.countDocuments({ status: "pending" });
    res.json({ petitionCount, failedSyncs, reportedComments, hiddenComments, draftUpdates, recentComments, pendingContactSuggestions });
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
    const invite = await createInviteLink({ email: req.body.email, role: req.body.role, invitedBy: req.user!._id });
    await audit(req, "invite", "user", user._id, { role: req.body.role });
    const data = user.toObject();
    delete data.passwordHash;
    res.status(201).json({ user: data, inviteLink: invite.link, expiresAt: invite.expiresAt });
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
