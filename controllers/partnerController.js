import nodemailer from "nodemailer";

export const createPartnerRequest = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      activity,
      profileLink,
      audience,
    } = req.body;

    // Настройка SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Кому отправлять
    const notificationEmail = process.env.PARTNER_NOTIFICATION_EMAIL;

    // Текст письма
    const htmlMessage = `
      <h2>Новая заявка на партнёрство</h2>
      <p><b>Имя:</b> ${fullName}</p>
      <p><b>Телефон:</b> ${phone}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Деятельность:</b> ${activity}</p>
      <p><b>Профиль:</b> ${profileLink}</p>
      <p><b>Аудитория:</b> ${audience}</p>
    `;

    // Отправка письма
    await transporter.sendMail({
      from: `"Madera Design" <${process.env.SMTP_USER}>`,
      to: notificationEmail,
      subject: "Новая заявка на партнёрство",
      html: htmlMessage,
    });

    return res.json({
      success: true,
      message: "Заявка успешно отправлена на почту.",
    });
  } catch (error) {
    console.error("Ошибка отправки письма:", error);
    return res.status(500).json({
      success: false,
      error: "Ошибка сервера при отправке письма",
    });
  }
};
