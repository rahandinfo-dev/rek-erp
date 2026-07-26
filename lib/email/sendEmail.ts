import nodemailer from "nodemailer";

function smtpSecure(): boolean {
  const flag = process.env.EMAIL_SECURE;
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  const port = Number(process.env.EMAIL_PORT || 587);
  return port === 465;
}

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: smtpSecure(),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[email] sent", info.messageId);
  }

  return info;
}
