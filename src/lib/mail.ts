import "server-only";
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export async function sendAuthMail(to: string, subject: string, url: string) {
  if (process.env.MAIL_MODE === "file") {
    const dir = join(process.cwd(), ".local-mail");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${Date.now()}-${randomUUID()}.txt`),
      `${subject}\nTo: ${to}\n\n${url}\n`,
      { mode: 0o600 },
    );
    return;
  }
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM)
    throw new Error("Email delivery is not configured.");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text: `${subject}\n\n${url}\n\nIf you did not request this, ignore this message.`,
  });
}
