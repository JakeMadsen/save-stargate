import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
let app: ReturnType<typeof import("./app.js").createApp>;
let User: typeof import("./models/User.js").User;
let CommunityTopic: typeof import("./models/CommunityTopic.js").CommunityTopic;
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
  ({ CommunityTopic } = await import("./models/CommunityTopic.js"));
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

  it("reports missing SMTP settings when sending a test email", async () => {
    await User.create({
      email: "email-owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });
    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({ email: "email-owner@example.com", password: "owner-password-123" }).expect(200);

    const response = await agent.post("/api/admin/email/test").send({ email: "target@example.com" }).expect(400);
    expect(response.body.error).toContain("SMTP");
  });

  it("stores public contact messages for the admin inbox", async () => {
    await User.create({
      email: "inbox-owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });

    await request(app)
      .post("/api/public/contact-messages")
      .send({
        name: "Supporter",
        email: "supporter@example.com",
        subject: "I can help",
        category: "volunteer",
        message: "I can help gather resources for the campaign."
      })
      .expect(201);

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "inbox-owner@example.com", password: "owner-password-123" }).expect(200);

    const inbox = await agent.get("/api/admin/contact-messages").expect(200);
    expect(inbox.body.messages[0].subject).toBe("I can help");

    const review = await agent
      .patch(`/api/admin/contact-messages/${inbox.body.messages[0]._id}`)
      .send({ status: "read", adminNote: "Follow up when email is ready." })
      .expect(200);

    expect(review.body.message.status).toBe("read");
    expect(review.body.message.adminNote).toBe("Follow up when email is ready.");
  });

  it("signs up public users only after email verification", async () => {
    const topic = await CommunityTopic.create({
      title: "Say hello",
      slug: "say-hello",
      bodyMarkdown: "Open discussion.",
      status: "published",
      pinned: false
    });
    const agent = request.agent(app);

    const signup = await agent
      .post("/api/auth/signup")
      .send({
        email: "fan@example.com",
        displayName: "Gate Fan",
        password: "public-password-123"
      })
      .expect(201);

    expect(signup.body.verificationLink).toContain("/verify-email?token=");

    await agent.post("/api/auth/login").send({ email: "fan@example.com", password: "public-password-123" }).expect(403);

    const token = new URL(signup.body.verificationLink).searchParams.get("token");
    await agent.post("/api/auth/verify-email").send({ token }).expect(200);

    await agent
      .post("/api/public/comments")
      .send({
        parentType: "topic",
        parentId: String(topic._id),
        body: "Happy to help keep the gate open."
      })
      .expect(201);
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
