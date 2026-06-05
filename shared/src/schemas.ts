import { z } from "zod";

export const roles = ["owner", "admin", "moderator", "user"] as const;
export const userStatuses = ["invited", "active", "banned"] as const;
export const contentStatuses = ["draft", "published", "archived"] as const;
export const petitionStatuses = ["active", "won", "paused", "archived"] as const;
export const commentStatuses = ["visible", "hidden", "deleted"] as const;
export const resourceTypes = ["youtube", "website", "podcast", "social", "press", "other"] as const;
export const contactKinds = ["entity", "person"] as const;
export const contactLinkTypes = [
  "website",
  "email",
  "facebook",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "production",
  "address",
  "source",
  "other"
] as const;
export const contactSuggestionStatuses = ["pending", "approved", "rejected"] as const;

export const emailSchema = z.string().trim().email().toLowerCase();
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected Mongo object id");
export const slugSchema = z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const markdownSchema = z.string().trim().min(1).max(20000);
export const optionalUrlSchema = z.string().trim().url().or(z.literal("")).optional();
export const contactUrlSchema = z.string().trim().refine((value) => {
  if (value.startsWith("mailto:")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.replace(/^mailto:/, ""));
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "Expected https:// or mailto: link");
export const contactImageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (/^\/uploads\/contacts\/[A-Za-z0-9._-]+$/.test(value)) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Expected uploaded contact image path or https:// image link");
export const petitionImageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (/^\/uploads\/petitions\/[A-Za-z0-9._-]+$/.test(value)) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Expected cached petition image path or https:// image link");

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  displayName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  password: z.string().min(10).max(200)
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "moderator", "user"])
});

export const updateUserSchema = z.object({
  role: z.enum(roles).optional(),
  status: z.enum(userStatuses).optional(),
  displayName: z.string().trim().min(2).max(80).optional()
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: slugSchema.optional(),
  summary: z.string().trim().min(10).max(400),
  bodyMarkdown: markdownSchema,
  tags: z.array(z.string().trim().min(1).max(30)).default([]),
  status: z.enum(contentStatuses).default("draft"),
  pinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  publishedAt: z.coerce.date().optional()
});

export const petitionSchema = z.object({
  title: z.string().trim().min(3).max(180),
  platform: z.string().trim().min(2).max(40).default("change.org"),
  url: z.string().trim().url(),
  description: z.string().trim().min(10).max(1200),
  imageUrl: petitionImageUrlSchema.optional().or(z.literal("")),
  status: z.enum(petitionStatuses).default("active"),
  currentCount: z.coerce.number().int().min(0).default(0),
  goalCount: z.coerce.number().int().min(0).default(0),
  latestUpdateTitle: z.string().trim().max(180).optional().or(z.literal("")),
  latestUpdateBody: z.string().trim().max(1200).optional().or(z.literal("")),
  latestUpdateAt: z.coerce.date().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(1).max(999).default(100),
  manualOverride: z.boolean().default(false),
  syncDisabledReason: z.string().trim().max(300).optional()
});

export const contactTargetSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(contactKinds).default("person"),
  organization: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  role: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  publicContactUrl: contactUrlSchema.optional().or(z.literal("")),
  sourceUrl: contactUrlSchema.optional().or(z.literal("")),
  imageUrl: contactImageUrlSchema.optional().or(z.literal("")),
  imageSourceUrl: contactUrlSchema.optional().or(z.literal("")),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(80),
        type: z.enum(contactLinkTypes).default("other"),
        url: contactUrlSchema
      })
    )
    .default([]),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  suggestedMessage: z.string().trim().min(10).max(1200),
  notes: z.string().trim().max(1200).optional(),
  status: z.enum(contentStatuses).default("published")
});

export const contactSuggestionSchema = z.object({
  contactTargetId: objectIdSchema.optional(),
  targetName: z.string().trim().min(2).max(160),
  kind: z.enum(contactKinds).default("entity"),
  submitterName: z.string().trim().max(100).optional().or(z.literal("")),
  submitterEmail: emailSchema.optional().or(z.literal("")),
  suggestedLabel: z.string().trim().min(2).max(100),
  suggestedType: z.enum(contactLinkTypes).default("other"),
  suggestedUrl: contactUrlSchema,
  notes: z.string().trim().min(5).max(1500)
});

export const reviewContactSuggestionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(1000).optional()
});

export const communityTopicSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: slugSchema.optional(),
  bodyMarkdown: markdownSchema,
  status: z.enum(contentStatuses).default("draft"),
  pinned: z.boolean().default(false)
});

export const commentSchema = z.object({
  parentType: z.enum(["update", "topic"]),
  parentId: objectIdSchema,
  body: z.string().trim().min(2).max(2500)
});

export const reportCommentSchema = z.object({
  reason: z.string().trim().min(3).max(300)
});

export const moderateCommentSchema = z.object({
  status: z.enum(commentStatuses)
});

export const resourceLinkSchema = z.object({
  title: z.string().trim().min(2).max(140),
  type: z.enum(resourceTypes).default("other"),
  url: z.string().trim().url(),
  description: z.string().trim().min(5).max(600),
  priority: z.coerce.number().int().min(1).max(10).default(5),
  tags: z.array(z.string().trim().min(1).max(30)).default([]),
  status: z.enum(contentStatuses).default("published")
});

export type Role = (typeof roles)[number];
export type UserStatus = (typeof userStatuses)[number];
export type ContentStatus = (typeof contentStatuses)[number];
export type PetitionStatus = (typeof petitionStatuses)[number];
export type CommentStatus = (typeof commentStatuses)[number];
export type ResourceType = (typeof resourceTypes)[number];
export type ContactKind = (typeof contactKinds)[number];
export type ContactLinkType = (typeof contactLinkTypes)[number];
export type ContactSuggestionStatus = (typeof contactSuggestionStatuses)[number];
