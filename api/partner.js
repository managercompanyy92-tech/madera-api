// api/partner.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const {
      name,
      phone,
      profession,
      profile,
      audience
    } = req.body;

    const chatId = process.env.TELEGRAM_CHAT_ID;
    const token = process.env.TELEGRAM_TOKEN;

    if (!chatId || !token) {
      return res.status(500).json({
        error: "Telegram credentials missing"
      });
    }

    const textMessage = 
`📩 Новая заявка на партнёрство:

Имя: ${name}
Телефон: ${phone}
Профессия: ${profession}
Профиль: ${profile}
Аудитория: ${audience}
`;

    const telegramURL = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(telegramURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMessage
      })
    });

    return res.status(200).json({
      ok: true,
      message: "Заявка успешно отправлена в Telegram"
    });

  } catch (err) {
    console.error("TELEGRAM ERROR:", err);
    return res.status(500).json({
      error: "Failed to send Telegram message",
      details: err.message
    });
  }
}
