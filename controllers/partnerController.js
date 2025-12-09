// controllers/partnerController.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Обработчик заявки партнёра
 * Ожидает в body:
 *  - name
 *  - phone
 *  - profession
 *  - profileLink
 *  - audience
 */
export const createPartnerRequest = async (req, res) => {
  try {
    console.log("=== НОВАЯ ЗАЯВКА ===");
console.log("BODY:", req.body);
    const {
      name,
      phone,
      profession,
      profileLink,
      audience,
    } = req.body || {};
console.log('PARTNER_REQUEST', {
      time: new Date().toISOString(),
      name,
      phone,
      profession,
      profileLink,
      audience,
    });
    // Минимальная валидация
    if (!name || !phone) {
      return res.status(400).json({
        error: 'REQUIRED_FIELDS_MISSING',
        message: 'Поле "Имя" и "Телефон" обязательны',
      });
    }

    // Формируем письмо
    const html = `
      <h2>Новая заявка на партнёрство</h2>
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Проф. деятельность:</strong> ${profession || '-'}</p>
      <p><strong>Профиль (Instagram и т.д.):</strong> ${profileLink || '-'}</p>
      <p><strong>Кратко об аудитории:</strong> ${audience || '-'}</p>
      <hr />
      <p><small>Отправлено с формы партнёров на сайте Madera Design.</small></p>
    `;

    // Транспорт для отправки почты
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // 465 — всегда secure
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Отправляем письмо
    await transporter.sendMail({
      from: `"Madera Design" <${process.env.SMTP_USER}>`,
      to: process.env.PARTNER_NOTIFICATION_EMAIL || process.env.SMTP_USER,
      subject: 'Новая заявка на партнёрство',
      html,
    });

    // Возвращаем успех фронтенду
    return res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при обработке заявки партнёра:', err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Не удалось отправить заявку. Попробуйте позже.',
    });
  }
};
