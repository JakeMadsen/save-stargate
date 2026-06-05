import { Petition } from "../models/Petition.js";
import { PetitionSnapshot } from "../models/PetitionSnapshot.js";

export const primaryPetition = {
  title: "Save the New Stargate Series",
  legacyTitle: "Save the Stargate revival",
  platform: "change.org",
  url: "https://www.change.org/p/save-the-new-stargate-series-let-martin-gero-build-the-future-of-the-franchise?source_location",
  description: "Ask Amazon MGM to let Martin Gero move forward with a new Stargate series.",
  baselineCount: 15976,
  displayOrder: 1
};

export const historicalPetitions = [
  {
    title: "Revive the Stargate Franchise",
    platform: "change.org",
    url: "https://www.change.org/p/amazonstudios-revive-the-stargate-franchise",
    description: "An older fan petition asking Amazon to revive Stargate.",
    status: "paused",
    currentCount: 43099,
    goalCount: 0,
    displayOrder: 20
  },
  {
    title: "Save Stargate Universe",
    platform: "change.org",
    url: "https://www.change.org/p/ted-sarandos-save-stargate-universe",
    description: "An earlier fan petition asking for Stargate Universe to continue.",
    status: "paused",
    currentCount: 121393,
    goalCount: 0,
    displayOrder: 21
  }
] as const;

export const ensurePrimaryPetition = async () => {
  const petition = await Petition.findOne({
    $or: [{ title: primaryPetition.legacyTitle }, { url: primaryPetition.url }]
  });

  if (!petition) {
    const created = await Petition.create({
      title: primaryPetition.title,
      platform: primaryPetition.platform,
      url: primaryPetition.url,
      description: primaryPetition.description,
      status: "active",
      currentCount: primaryPetition.baselineCount,
      goalCount: 0,
      displayOrder: primaryPetition.displayOrder,
      manualOverride: false,
      syncStatus: "never",
      syncDisabledReason: ""
    });

    await PetitionSnapshot.create({
      petitionId: created._id,
      count: created.currentCount,
      goal: created.goalCount,
      source: "manual"
    });

    return created;
  }

  const previousCount = petition.currentCount;
  petition.title = primaryPetition.title;
  petition.platform = primaryPetition.platform;
  petition.url = primaryPetition.url;
  petition.description = primaryPetition.description;
  petition.status = "active";
  petition.currentCount = Math.max(petition.currentCount ?? 0, primaryPetition.baselineCount);
  petition.goalCount = petition.goalCount ?? 0;
  petition.displayOrder = primaryPetition.displayOrder;
  petition.manualOverride = false;
  petition.syncStatus = petition.syncStatus === "disabled" ? "never" : petition.syncStatus;
  petition.syncDisabledReason = "";
  await petition.save();

  if (previousCount !== petition.currentCount) {
    await PetitionSnapshot.create({
      petitionId: petition._id,
      count: petition.currentCount,
      goal: petition.goalCount,
      source: "manual"
    });
  }

  return petition;
};

export const ensureHistoricalPetitions = async () => {
  const ensured = [];

  for (const item of historicalPetitions) {
    const petition = await Petition.findOne({ url: item.url });

    if (!petition) {
      const created = await Petition.create({
        ...item,
        manualOverride: false,
        syncStatus: "never",
        syncDisabledReason: ""
      });

      await PetitionSnapshot.create({
        petitionId: created._id,
        count: created.currentCount,
        goal: created.goalCount,
        source: "manual"
      });
      ensured.push(created);
      continue;
    }

    const previousCount = petition.currentCount;
    petition.title = item.title;
    petition.platform = item.platform;
    petition.url = item.url;
    petition.description = item.description;
    petition.status = item.status;
    petition.currentCount = Math.max(petition.currentCount ?? 0, item.currentCount);
    petition.goalCount = petition.goalCount ?? item.goalCount;
    petition.displayOrder = item.displayOrder;
    petition.manualOverride = false;
    petition.syncStatus = petition.syncStatus === "disabled" ? "never" : petition.syncStatus;
    petition.syncDisabledReason = "";
    await petition.save();

    if (previousCount !== petition.currentCount) {
      await PetitionSnapshot.create({
        petitionId: petition._id,
        count: petition.currentCount,
        goal: petition.goalCount,
        source: "manual"
      });
    }

    ensured.push(petition);
  }

  return ensured;
};
