// api/partner.js
const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Missing SMTP env vars');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true для 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, phone, profession, profile, audience } = req.body || {};

    // простая проверка полей
    if (!name || !phone || !profession || !profile || !audience) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = createTransport();

    const to =
      process.env.PARTNER_NOTIFICATION_EMAIL || process.env.SMTP_USER;

    const text = `
Имя: ${name}
Телефон: ${phone}
Профдеятельность: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
`.trim();

    await transporter.sendMail({
      from: `"Madera Design" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Новая заявка на партнёрство',
      text,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email sending failed', err);
    return res.status(500).json({
      error: 'Email sending failed',
      details: err.message,
    });
  }
};
