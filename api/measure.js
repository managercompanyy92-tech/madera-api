// api/measure.js

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  // Проверяем наличие токена и chat_id
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID");
    return res.status(500).json({
      ok: false,
      message: "Server Telegram config error"
    });
  }

  try {
    const {
      name,
      phone,
      address,
      landmark,
      contactMethod,
      category,
      length,
      tariff,
      promo,
      description
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        ok: false,
        message: "Name and phone are required"
      });
    }

    const text =
`🟧 *Новая заявка на замер и расчёт:*

🧑‍💼 *Имя:* ${name}
📞 *Телефон:* ${phone}
📍 *Адрес:* ${address || "-"}
🧭 *Ориентир:* ${landmark || "-"}
💬 *Способ связи:* ${contactMethod || "-"}
🪑 *Категория мебели:* ${category || "-"}
📏 *Длина проекта:* ${length || "-"}
💰 *Тариф:* ${tariff || "-"}
🎟 *Промокод:* ${promo || "нет"}
📝 *Описание:* ${description || "-"}`;


    // Отправка сообщения в Telegram
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const tgResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown"
      })
    });

    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error("Telegram error:", tgData);
      return res.status(500).json({
        ok: false,
        message: "Telegram sending failed"
      });
    }

    return res.status(200).json({ ok: true, message: "Success" });

  } catch (err) {
    console.error("Measure form error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal Server Error"
    });
  }
}
