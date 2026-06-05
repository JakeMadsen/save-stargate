import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
let app: ReturnType<typeof import("./app.js").createApp>;
let User: typeof import("./models/User.js").User;
let createInviteLink: typeof import("./services/authTokens.js").createInviteLink;
let hashPassword: typeof import("./services/passwords.js").hashPassword;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.SESSION_SECRET = "test-secret";
  process.env.APP_URL = "http://localhost:5173";
  process.env.NODE_ENV = "test";

  const { createApp } = await import("./app.js");
  ({ User } = await import("./models/User.js"));
  ({ createInviteLink } = await import("./services/authTokens.js"));
  ({ hashPassword } = await import("./services/passwords.js"));
  await mongoose.connect(process.env.MONGO_URI);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("app integration", () => {
  it("logs in with email/password and creates an admin update", async () => {
    await User.create({
      email: "owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("correct-horse-battery")
    });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({ email: "owner@example.com", password: "correct-horse-battery" }).expect(200);

    const response = await agent
      .post("/api/admin/updates")
      .send({
        title: "Dial the campaign",
        summary: "A first public update for supporters.",
        bodyMarkdown: "Keep the signal strong.",
        tags: ["action"],
        status: "published",
        pinned: true,
        allowComments: true
      })
      .expect(201);

    expect(response.body.item.slug).toBe("dial-the-campaign");
  });

  it("protects admin routes from anonymous visitors", async () => {
    await request(app).get("/api/admin/dashboard").expect(401);
  });

  it("accepts moderator invites by setting a password", async () => {
    const owner = await User.create({
      email: "owner2@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });
    const { link } = await createInviteLink({ email: "mod@example.com", role: "moderator", invitedBy: owner._id });
    const token = new URL(link).searchParams.get("token");
    const agent = request.agent(app);

    await agent
      .post("/api/auth/invites/accept")
      .send({ token, displayName: "Mod One", password: "moderator-password-123" })
      .expect(200);

    await agent.get("/api/admin/dashboard").expect(200);
  });
});
