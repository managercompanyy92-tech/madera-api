// /api/partner.js

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests allowed"
    });
  }

  try {
    const { name, phone, profession, profile, audience } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required"
      });
    }

    // SMTP настройки
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const text = `
Новая заявка партнёрства:

Имя: ${name}
Телефон: ${phone}
Профессия: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
`;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.PARTNER_NOTIFICATION_EMAIL,
      subject: "Новая партнёрская заявка",
      text
    });

    return res.status(200).json({
      success: true,
      message: "Партнерская заявка успешно отправлена"
    });

  } catch (error) {
    console.error("Error in /api/partner:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}
