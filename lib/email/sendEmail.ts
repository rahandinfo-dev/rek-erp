import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP ERROR:");
    console.error(error);
  } else {
    console.log("SMTP READY");
  }
});

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log("==================================");
  console.log("EMAIL SENT");
  console.log("MESSAGE ID:", info.messageId);
  console.log("ACCEPTED:", info.accepted);
  console.log("REJECTED:", info.rejected);
  console.log("RESPONSE:", info.response);
  console.log("==================================");

  return info;
}