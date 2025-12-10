// api/measure.js

import { sendTelegramMessage } from '../utils/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" });
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
`🟩 *Новая заявка на замер:*  

🧑‍💼 *Имя:* ${name}
📞 *Телефон:* ${phone}
📍 *Адрес:* ${address || "-"}
🧭 *Ориентир:* ${landmark || "-"}
💬 *Способ связи:* ${contactMethod || "-"}
🪑 *Категория:* ${category || "-"}
📏 *Длина проекта:* ${length || "-"}
💰 *Тариф:* ${tariff || "-"}
🎟 *Промокод:* ${promo || "нет"}
📝 *Описание:* ${description || "-"}`;

    await sendTelegramMessage(text);

    return res.status(200).json({ success: true });

  } catch (e) {
    console.error("Measure error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
