import * as cheerio from "cheerio";
import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";
import { config } from "../config.js";

export type ParsedPetitionStats = {
  count?: number;
  goal?: number;
};

const parseNumber = (value: string | undefined) => {
  if (!value) return undefined;
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return undefined;
  return Number(normalized);
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

  return { count, goal };
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
