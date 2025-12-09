import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, phone, profession, profile, audience } = req.body;

    // EMAIL TRANSPORT
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.PARTNER_NOTIFICATION_EMAIL,
      subject: "Новая заявка на партнёрство",
      text: `
Имя: ${name}
Телефон: ${phone}
Профессия: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
      `,
    });

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("Email sending error:", error);
    return res.status(500).json({ error: "Email sending failed" });
  }
}
