import mongoose from "mongoose";
import { config } from "./config.js";
import { User } from "./models/User.js";

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  await seedOwner();
};

const seedOwner = async () => {
  if (!config.ownerEmail) return;

  const existingOwner = await User.findOne({ role: "owner" });
  if (existingOwner) return;

  await User.findOneAndUpdate(
    { email: config.ownerEmail },
    {
      email: config.ownerEmail,
      displayName: "Campaign Owner",
      role: "owner",
      status: "active"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
