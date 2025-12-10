import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, phone, profession, profile, audience } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.PARTNER_NOTIFICATION_EMAIL,
      subject: "Новая партнерская заявка",
      text: `
Имя: ${name}
Телефон: ${phone}
Профессия: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      ok: true,
      message: "Email sent successfully"
    });

  } catch (err) {
    console.error("EMAIL ERROR:", err);
    return res.status(500).json({
      error: "Email sending failed",
      details: err.message
    });
  }
}
