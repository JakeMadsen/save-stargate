import { Schema, model } from "mongoose";
import { defaultSiteSettings } from "../defaultSiteSettings.js";

const siteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    siteName: { type: String, default: defaultSiteSettings.siteName },
    navBrand: { type: String, default: defaultSiteSettings.navBrand },
    footerNote: { type: String, default: defaultSiteSettings.footerNote },
    homeSeoTitle: { type: String, default: defaultSiteSettings.homeSeoTitle },
    homeSeoDescription: { type: String, default: defaultSiteSettings.homeSeoDescription },
    heroEyebrow: { type: String, default: defaultSiteSettings.heroEyebrow },
    heroTitle: { type: String, default: defaultSiteSettings.heroTitle },
    heroBody: { type: String, default: defaultSiteSettings.heroBody },
    heroPrimaryLabel: { type: String, default: defaultSiteSettings.heroPrimaryLabel },
    heroPrimaryPath: { type: String, default: defaultSiteSettings.heroPrimaryPath },
    heroSecondaryLabel: { type: String, default: defaultSiteSettings.heroSecondaryLabel },
    heroSecondaryPath: { type: String, default: defaultSiteSettings.heroSecondaryPath },
    actionOneTitle: { type: String, default: defaultSiteSettings.actionOneTitle },
    actionOneBody: { type: String, default: defaultSiteSettings.actionOneBody },
    actionTwoTitle: { type: String, default: defaultSiteSettings.actionTwoTitle },
    actionTwoBody: { type: String, default: defaultSiteSettings.actionTwoBody },
    actionThreeTitle: { type: String, default: defaultSiteSettings.actionThreeTitle },
    actionThreeBody: { type: String, default: defaultSiteSettings.actionThreeBody },
    campaignProducerNames: { type: [String], default: defaultSiteSettings.campaignProducerNames },
    campaignCopy: { type: String, default: defaultSiteSettings.campaignCopy },
    campaignHashtags: { type: [String], default: defaultSiteSettings.campaignHashtags },
    siteInboxKicker: { type: String, default: defaultSiteSettings.siteInboxKicker },
    siteInboxTitle: { type: String, default: defaultSiteSettings.siteInboxTitle },
    siteInboxBody: { type: String, default: defaultSiteSettings.siteInboxBody },
    siteInboxButtonLabel: { type: String, default: defaultSiteSettings.siteInboxButtonLabel },
    latestUpdateTitle: { type: String, default: defaultSiteSettings.latestUpdateTitle },
    currentPetitionsTitle: { type: String, default: defaultSiteSettings.currentPetitionsTitle },
    contactSectionTitle: { type: String, default: defaultSiteSettings.contactSectionTitle },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const SiteSettings = model("SiteSettings", siteSettingsSchema);
