import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
let app: ReturnType<typeof import("./app.js").createApp>;
let User: typeof import("./models/User.js").User;
let CommunityTopic: typeof import("./models/CommunityTopic.js").CommunityTopic;
let FanMessage: typeof import("./models/FanMessage.js").FanMessage;
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
  ({ FanMessage } = await import("./models/FanMessage.js"));
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

  it("serves robots and sitemap files for crawlers", async () => {
    await CommunityTopic.create({
      title: "Crawler visible topic",
      slug: "crawler-visible-topic",
      bodyMarkdown: "A published community topic.",
      status: "published",
      pinned: false
    });

    const robots = await request(app).get("/robots.txt").expect(200);
    expect(robots.text).toContain("Sitemap:");
    expect(robots.text).toContain("Disallow: /admin");

    const sitemap = await request(app).get("/sitemap.xml").expect(200);
    expect(sitemap.text).toContain("<urlset");
    expect(sitemap.text).toContain("/petitions");
    expect(sitemap.text).toContain("/community/crawler-visible-topic");
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
      .set("Host", "savethegate.org")
      .set("X-Forwarded-Proto", "https")
      .send({
        email: "fan@example.com",
        displayName: "Gate Fan",
        password: "public-password-123"
      })
      .expect(201);

    expect(signup.body.verificationLink).toContain("/verify-email?token=");
    expect(signup.body.verificationLink).toMatch(/^https:\/\/savethegate\.org\/verify-email\?token=/);

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

  it("publishes anonymous fan messages only after email verification", async () => {
    const response = await request(app)
      .post("/api/public/fan-messages")
      .set("Host", "savethegate.org")
      .set("X-Forwarded-Proto", "https")
      .send({
        displayName: "Old school fan",
        email: "story@example.com",
        message: "Stargate was the show that made exploration feel hopeful, funny, and human every single week."
      })
      .expect(201);

    expect(response.body.published).toBe(false);
    expect(response.body.verificationLink).toMatch(/^https:\/\/savethegate\.org\/fan-messages\/verify\?token=/);
    expect(await FanMessage.countDocuments({ status: "visible" })).toBe(0);

    const token = new URL(response.body.verificationLink).searchParams.get("token");
    await request(app).post("/api/public/fan-messages/verify").send({ token }).expect(200);

    const messages = await request(app).get("/api/public/fan-messages").expect(200);
    expect(messages.body.messages[0].displayName).toBe("Old school fan");
  });

  it("tracks page traffic for admins", async () => {
    await User.create({
      email: "traffic-owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });

    await request(app).post("/api/public/traffic").send({ path: "/fan-messages" }).expect(204);

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "traffic-owner@example.com", password: "owner-password-123" }).expect(200);
    const traffic = await agent.get("/api/admin/traffic").expect(200);

    expect(traffic.body.totalViews).toBeGreaterThanOrEqual(1);
    expect(traffic.body.byPath.some((item: any) => item.path === "/fan-messages")).toBe(true);
  });

  it("tracks outbound clicks for admins", async () => {
    await User.create({
      email: "click-owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });

    await request(app)
      .post("/api/public/clicks")
      .send({
        category: "gofundme",
        label: "SaveStargate GoFundMe",
        targetUrl: "https://www.gofundme.com/f/savestargate-dont-close-the-gate",
        sourcePath: "/"
      })
      .expect(204);

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "click-owner@example.com", password: "owner-password-123" }).expect(200);
    const traffic = await agent.get("/api/admin/traffic").expect(200);

    expect(traffic.body.clicks30Days).toBeGreaterThanOrEqual(1);
    expect(traffic.body.byClickTarget.some((item: any) => item.label === "SaveStargate GoFundMe")).toBe(true);
  });

  it("lets admins delete user accounts", async () => {
    const owner = await User.create({
      email: "delete-owner@example.com",
      role: "owner",
      status: "active",
      passwordHash: await hashPassword("owner-password-123")
    });
    const member = await User.create({
      email: "delete-me@example.com",
      role: "user",
      status: "active",
      passwordHash: await hashPassword("member-password-123")
    });
    expect(owner.email).toBe("delete-owner@example.com");

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "delete-owner@example.com", password: "owner-password-123" }).expect(200);
    await agent.delete(`/api/admin/users/${member._id}`).expect(200);

    expect(await User.findById(member._id)).toBeNull();
  });

  it("prevents admins from deleting other admin accounts", async () => {
    await User.create({
      email: "limited-admin@example.com",
      role: "admin",
      status: "active",
      passwordHash: await hashPassword("admin-password-123")
    });
    const otherAdmin = await User.create({
      email: "other-admin@example.com",
      role: "admin",
      status: "active",
      passwordHash: await hashPassword("admin-password-123")
    });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "limited-admin@example.com", password: "admin-password-123" }).expect(200);
    await agent.delete(`/api/admin/users/${otherAdmin._id}`).expect(403);

    expect(await User.findById(otherAdmin._id)).not.toBeNull();
  });
});
