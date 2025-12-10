// api/partner.js
import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP env vars are missing');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function setCors(res) {
  // можешь вместо * указать конкретный домен сайта
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, phone, profession, profile, audience } = req.body || {};

    if (!name || !phone || !profession || !profile || !audience) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const transporter = createTransport();
    const to = process.env.PARTNER_NOTIFICATION_EMAIL;

    if (!to) {
      throw new Error('PARTNER_NOTIFICATION_EMAIL is not set');
    }

    const mailOptions = {
      from: `"Madera Design" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Новая заявка на партнёрство (демо)',
      text: `
Имя: ${name}
Телефон: ${phone}
Профдеятельность: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId || info);

    return res.status(200).json({
      success: true,
      message: 'Partner request sent',
    });
  } catch (err) {
    console.error('Email sending failed:', err);
    return res.status(500).json({
      error: 'Email sending failed',
      details: err.message,
    });
  }
}
