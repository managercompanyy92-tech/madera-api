// api/partner.js

// Этот обработчик принимает POST-заявку с сайта
// и пересылает её в Telegram-бот

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, phone, profession, profile, audience } = req.body || {};

  // Проверка обязательных полей (на случай, если с фронта что-то не придёт)
  if (!name || !phone || !profession || !profile || !audience) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Telegram env vars are missing",
    });
  }

  // Текст сообщения в Telegram
  const text = `
Новая заявка на партнёрство:
Имя: ${name}
Телефон: ${phone}
Профессия: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
`.trim();

  try {
    // Отправляем сообщение в Telegram
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );

    const tgData = await tgResponse.json();

    if (!tgResponse.ok) {
      console.error("Telegram API error:", tgData);
      return res.status(502).json({
        error: "Telegram API error",
        details: tgData,
      });
    }

    // Всё прошло успешно
    return res.status(200).json({
      ok: true,
      message: "Telegram message sent",
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
