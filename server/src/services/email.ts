import nodemailer from "nodemailer";
import { config } from "../config.js";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const isEmailConfigured = () => Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const createTransport = () => {
  if (!isEmailConfigured()) {
    throw new Error("SMTP is not configured");
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTls,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });
};

export const verifyEmailSettings = async () => {
  const transport = createTransport();
  await transport.verify();
};

export const sendMail = async (params: { to: string; subject: string; text: string; html?: string }) => {
  const transport = createTransport();
  return transport.sendMail({
    from: config.smtp.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html
  });
};

export const sendInviteEmail = async (email: string, link: string) => {
  const subject = "You are invited to Save The Gate";
  const safeLink = escapeHtml(link);

  if (!isEmailConfigured()) {
    console.log(`[invite-link] ${email}: ${link}`);
    return;
  }

  await sendMail({
    to: email,
    subject,
    text: `Use this one-time link to create your moderator password: ${link}\n\nIt expires in 7 days.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172233">
        <h1 style="font-size:22px;margin:0 0 12px">You are invited to Save The Gate</h1>
        <p>Use this one-time link to create your moderator password. It expires in 7 days.</p>
        <p><a href="${safeLink}" style="display:inline-block;background:#0b778d;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Accept invite</a></p>
        <p style="font-size:13px;color:#5c6b82">If the button does not work, open this link: ${safeLink}</p>
      </div>
    `
  });
};

export const sendVerificationEmail = async (email: string, link: string) => {
  const subject = "Verify your Save The Gate account";
  const safeLink = escapeHtml(link);

  if (!isEmailConfigured()) {
    console.log(`[verify-email-link] ${email}: ${link}`);
    return;
  }

  await sendMail({
    to: email,
    subject,
    text: `Verify your Save The Gate account with this one-time link: ${link}\n\nIt expires in 24 hours.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172233">
        <h1 style="font-size:22px;margin:0 0 12px">Verify your Save The Gate account</h1>
        <p>Use this one-time link to confirm your email and join the discussion. It expires in 24 hours.</p>
        <p><a href="${safeLink}" style="display:inline-block;background:#1d4f91;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Verify email</a></p>
        <p style="font-size:13px;color:#5c6b82">If the button does not work, open this link: ${safeLink}</p>
      </div>
    `
  });
};

export const sendFanMessageVerificationEmail = async (email: string, link: string) => {
  const subject = "Confirm your Save The Gate message";
  const safeLink = escapeHtml(link);

  if (!isEmailConfigured()) {
    console.log(`[fan-message-link] ${email}: ${link}`);
    return;
  }

  await sendMail({
    to: email,
    subject,
    text: `Confirm your Save The Gate message with this one-time link: ${link}\n\nIt expires in 24 hours.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172233">
        <h1 style="font-size:22px;margin:0 0 12px">Confirm your message</h1>
        <p>Use this one-time link to confirm your message for Save The Gate. It expires in 24 hours.</p>
        <p><a href="${safeLink}" style="display:inline-block;background:#1d4f91;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Confirm message</a></p>
        <p style="font-size:13px;color:#5c6b82">If the button does not work, open this link: ${safeLink}</p>
      </div>
    `
  });
};

export const sendTestEmail = async (email: string) => {
  await sendMail({
    to: email,
    subject: "Save The Gate email test",
    text: "Save The Gate can send email. Moderator invites should work from this environment.",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172233">
        <h1 style="font-size:22px;margin:0 0 12px">Save The Gate email test</h1>
        <p>Mail delivery is working from this environment. Moderator invites should now arrive by email.</p>
      </div>
    `
  });
};
