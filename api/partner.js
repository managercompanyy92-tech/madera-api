// api/partner.js

import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP env vars are not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true для 465, иначе false
    auth: {
      user,
      pass,
    },
  });
}

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { name, phone, profession, profile, audience } = req.body || {};

    // Простая валидация
    if (!name || !phone) {
      return res.status(400).json({
        error: 'REQUIRED_FIELDS_MISSING',
        message: 'Поля "Имя" и "Телефон" обязательны',
      });
    }

    const html = `
      <h2>Новая заявка на партнёрство</h2>
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Проф. деятельность:</strong> ${profession || '—'}</p>
      <p><strong>Профиль:</strong> ${profile || '—'}</p>
      <p><strong>Аудитория:</strong> ${audience || '—'}</p>
    `;

    const transporter = createTransport();

    const toEmail = process.env.PARTNER_NOTIFICATION_EMAIL;
    if (!toEmail) {
      throw new Error('PARTNER_NOTIFICATION_EMAIL is not set');
    }

    await transporter.sendMail({
      from: `"Madera Design" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Новая заявка на партнёрство с сайта',
      html,
    });

    return res.status(200).json({
      success: true,
      message: 'Заявка отправлена успешно',
    });
  } catch (err) {
    console.error('PARTNER_HANDLER_ERROR:', err);

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ошибка сервера при обработке заявки',
    });
  }
}
