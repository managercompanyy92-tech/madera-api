// api/measure.js

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  // preflight от браузера
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing TELEGRAM env vars");
    return res
      .status(500)
      .json({ ok: false, message: "Server config error (Telegram env)" });
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
      description,
      hasPaymentCheck, // <- добавили флаг по чеку
    } = req.body || {};

    if (!name || !phone) {
      return res
        .status(400)
        .json({ ok: false, message: "Name and phone are required" });
    }

    const text = `
🟧 *Новая заявка на замер и расчёт:*
🧑‍💼 *Имя:* ${name}
📞 *Телефон:* ${phone}
📍 *Адрес:* ${address || "-"}
🧭 *Ориентир:* ${landmark || "-"}
💬 *Способ связи:* ${contactMethod || "-"}
🪑 *Категория мебели:* ${category || "-"}
📏 *Длина проекта:* ${length || "-"}
💰 *Тариф:* ${tariff || "-"}
🎟 *Промокод:* ${promo || "нет"}
🧾 *Чек об оплате:* ${hasPaymentCheck ? "прикреплён" : "не прикреплён"}
📝 *Описание:* ${description || "-"}
`.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const tgResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });

    const tgData = await tgResponse.json().catch(() => ({}));
    if (!tgResponse.ok || tgData.ok === false) {
      console.error("Telegram error:", tgData);
      return res.status(500).json({ ok: false, message: "Telegram error" });
    }

    return res.status(200).json({ ok: true, message: "Sent successfully" });
  } catch (err) {
    console.error("Measure form error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Internal Server Error" });
  }
}
