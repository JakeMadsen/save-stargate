import * as cheerio from "cheerio";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";
import { config } from "../config.js";
import { slugify } from "../utils/slug.js";

export type ParsedPetitionStats = {
  count?: number;
  goal?: number;
  imageUrl?: string;
  latestUpdateTitle?: string;
  latestUpdateBody?: string;
  latestUpdateAt?: Date;
};

const parseNumber = (value: string | undefined) => {
  if (!value) return undefined;
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return undefined;
  return Number(normalized);
};

const normalizeUrl = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return undefined;
};

const decodeJsonString = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\u002F/g, "/").replace(/\\n/g, "\n");
  }
};

const textFromHtml = (value: string | undefined) => {
  const decoded = decodeJsonString(value);
  if (!decoded) return undefined;
  const text = cheerio.load(decoded).text().replace(/\s+/g, " ").trim();
  return text || undefined;
};

const imageExtension = (contentType: string | null, url: string) => {
  if (contentType?.includes("image/png")) return ".png";
  if (contentType?.includes("image/webp")) return ".webp";
  if (contentType?.includes("image/gif")) return ".gif";
  if (contentType?.includes("image/jpeg") || contentType?.includes("image/jpg")) return ".jpg";
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension) ? extension.replace(".jpeg", ".jpg") : ".jpg";
};

const cachePetitionImage = async (imageUrl: string, petitionTitle: string) => {
  const response = await fetch(imageUrl, {
    headers: {
      "user-agent": "SaveTheGate/0.1 petition image cache"
    }
  });
  if (!response.ok) throw new Error(`Image fetch returned ${response.status}`);

  const contentType = response.headers.get("content-type");
  if (!contentType?.startsWith("image/")) throw new Error("Petition image response was not an image");

  const extension = imageExtension(contentType, imageUrl);
  const filename = `${slugify(petitionTitle)}${extension}`;
  const uploadDir = path.resolve(process.cwd(), "uploads", "petitions");
  mkdirSync(uploadDir, { recursive: true });

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);
  return `/uploads/petitions/${filename}`;
};

export const parsePetitionStats = (html: string): ParsedPetitionStats => {
  const $ = cheerio.load(html);
  const jsonText = $("#__NEXT_DATA__").text() || $("script[type='application/ld+json']").first().text();
  const searchable = `${jsonText}\n${$.text()}`;

  const count =
    parseNumber(searchable.match(/"signatureCount"\s*:\s*"?([\d,.\s]+)"?/i)?.[1]) ??
    parseNumber(searchable.match(/"supporterCount"\s*:\s*"?([\d,.\s]+)"?/i)?.[1]) ??
    parseNumber(searchable.match(/([\d,.\s]+)\s*(?:verified signatures|signatures?\s+v[ée]rifi[ée]es?)/i)?.[1]) ??
    parseNumber(searchable.match(/([\d,.\s]+)\s+(?:supporters|signatures)\b/i)?.[1]);

  const goal =
    parseNumber(searchable.match(/"goal"\s*:\s*"?([\d,.\s]+)"?/i)?.[1]) ??
    parseNumber(searchable.match(/([\d,.\s]+)\s+signature goal\b/i)?.[1]);

  const imageUrl =
    normalizeUrl($('meta[property="og:image"]').attr("content")) ??
    normalizeUrl($('meta[name="twitter:image"]').attr("content")) ??
    normalizeUrl($('link[rel="preload"][as="image"]').last().attr("href")) ??
    normalizeUrl(searchable.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i)?.[1]);

  const updateNode = html.match(/"starterPetitionUpdatesConnection"\s*:\s*\{\s*"nodes"\s*:\s*\[\{([\s\S]*?)\}\s*\]/)?.[1];
  const latestUpdateTitle = decodeJsonString(updateNode?.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1])?.trim();
  const latestUpdateBody = textFromHtml(updateNode?.match(/"description"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1]);
  const latestUpdateAtRaw = decodeJsonString(updateNode?.match(/"createdAt"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1]);
  const latestUpdateAt = latestUpdateAtRaw && Number.isFinite(Date.parse(latestUpdateAtRaw)) ? new Date(latestUpdateAtRaw) : undefined;

  return {
    ...(count !== undefined ? { count } : {}),
    ...(goal !== undefined ? { goal } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(latestUpdateTitle ? { latestUpdateTitle } : {}),
    ...(latestUpdateBody ? { latestUpdateBody } : {}),
    ...(latestUpdateAt ? { latestUpdateAt } : {})
  };
};

export const syncOnePetition = async (petitionId: string) => {
  const petition = await Petition.findById(petitionId);
  if (!petition || petition.manualOverride || petition.syncDisabledReason) return null;

  try {
    const response = await fetch(petition.url, {
      headers: {
        "user-agent": "SaveTheGate/0.1 petition progress monitor"
      }
    });

    if (!response.ok) throw new Error(`Change.org returned ${response.status}`);

    const html = await response.text();
    const stats = parsePetitionStats(html);
    if (stats.count === undefined) throw new Error("No signature count found in page markup");

    const previousCount = petition.currentCount;
    petition.currentCount = stats.count;
    if (stats.goal !== undefined) petition.goalCount = stats.goal;
    if (stats.imageUrl) {
      try {
        petition.imageUrl = await cachePetitionImage(stats.imageUrl, petition.title);
      } catch (error) {
        console.warn(`Petition image cache failed for ${petition._id}:`, error);
        petition.imageUrl = stats.imageUrl;
      }
    }
    if (stats.latestUpdateTitle) petition.latestUpdateTitle = stats.latestUpdateTitle;
    if (stats.latestUpdateBody) petition.latestUpdateBody = stats.latestUpdateBody;
    if (stats.latestUpdateAt) petition.latestUpdateAt = stats.latestUpdateAt;
    petition.lastSyncedAt = new Date();
    petition.syncStatus = "ok";
    await petition.save();

    if (previousCount !== petition.currentCount) {
      await PetitionSnapshot.create({
        petitionId: petition._id,
        count: petition.currentCount,
        goal: petition.goalCount,
        source: "sync"
      });
    }

    return petition;
  } catch (error) {
    petition.lastSyncedAt = new Date();
    petition.syncStatus = "failed";
    await petition.save();
    throw error;
  }
};

export const syncActivePetitions = async () => {
  const petitions = await Petition.find({
    status: { $ne: "archived" },
    manualOverride: false,
    syncDisabledReason: { $in: [null, ""] }
  }).select("_id");

  const results = [];
  for (const petition of petitions) {
    try {
      results.push(await syncOnePetition(String(petition._id)));
    } catch (error) {
      console.warn(`Petition sync failed for ${petition._id}:`, error);
    }
  }
  return results;
};

export const startPetitionSyncScheduler = () => {
  const intervalMs = Math.max(config.petitionSyncIntervalMinutes, 5) * 60 * 1000;
  const timer = setInterval(() => {
    void syncActivePetitions();
  }, intervalMs);
  timer.unref();
  void syncActivePetitions();
  return timer;
};
