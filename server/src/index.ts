import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { startPetitionSyncScheduler } from "./services/petitionSync.js";
import { ensureHistoricalPetitions, ensurePrimaryPetition, primaryPetition } from "./services/primaryPetition.js";

const localUrl = `http://localhost:${config.port}`;
const publicUrl = config.appUrl || localUrl;

console.log("");
console.log("Save The Gate is starting.");
console.log(`Open site: ${publicUrl}`);
if (publicUrl !== localUrl) {
  console.log(`Local URL: ${localUrl}`);
}
console.log("");

const app = createApp();
const server = app.listen(config.port, () => {
  console.log("");
  console.log("Save The Gate is running.");
  console.log(`Open site: ${publicUrl}`);
  if (publicUrl !== localUrl) {
    console.log(`Local URL: ${localUrl}`);
  }
  console.log("");
});

connectDatabase()
  .then(async () => {
    console.log("MongoDB connected. API, auth, admin tools, and petition sync are ready.");
    const petition = await ensurePrimaryPetition();
    const historical = await ensureHistoricalPetitions();
    console.log(`Primary petition tracked: ${primaryPetition.url}`);
    console.log(`Current stored signatures: ${petition.currentCount.toLocaleString("en-US")}`);
    console.log(`Historical petitions listed: ${historical.length}`);
    startPetitionSyncScheduler();
  })
  .catch((error) => {
    console.error("");
    console.error("MongoDB connection failed.");
    console.error("The public React app is still available, but API/admin features need MongoDB.");
    console.error(`Set MONGO_URI in .env or start MongoDB, then restart npm start.`);
    console.error(error instanceof Error ? error.message : error);
    console.error("");
  });

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
