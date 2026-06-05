import nodemailer from "nodemailer";
import { config } from "../config.js";

export const sendInviteEmail = async (email: string, link: string) => {
  const subject = "You are invited to Save The Gate";

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.log(`[invite-link] ${email}: ${link}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    text: `Use this one-time link to create your moderator password: ${link}\n\nIt expires soon.`
  });
};
