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

    const text =
      `🟩 *Новая заявка на замер:*\n\n` +
      `👤 *Имя:* ${name}\n` +
      `📞 *Телефон:* ${phone}\n` +
      `📍 *Адрес:* ${address}\n` +
      `🧭 *Ориентир:* ${landmark}\n` +
      `💬 *Способ связи:* ${contactMethod}\n` +
      `🪑 *Категория:* ${category}\n` +
      `📏 *Длина проекта:* ${length}\n` +
      `💰 *Тариф:* ${tariff}\n` +
      `🎟 *Промокод:* ${promo || "нет"}\n` +
      `📝 *Описание:* ${description}`;

    await sendTelegramMessage(text);

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Measure error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
