// api/partner.js

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  // Разрешаем preflight-запрос от браузера (OPTIONS),
  // чтобы не было ошибки 405
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
    const { name, phone, profession, profile, audience } = req.body || {};

    if (!name || !phone) {
      return res
        .status(400)
        .json({ ok: false, message: "Name and phone are required" });
    }

    const text =
      "Новая заявка на партнёрство:\n" +
      `Имя: ${name}\n` +
      `Телефон: ${phone}\n` +
      `Профессия: ${profession || "-"}\n` +
      `Профиль: ${profile || "-"}\n` +
      `Аудитория: ${audience || "-"}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const tgResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
      }),
    });

    const tgData = await tgResponse.json().catch(() => ({}));

    if (!tgResponse.ok || tgData.ok === false) {
      console.error("TELEGRAM ERROR:", tgData);
      return res
        .status(500)
        .json({ ok: false, message: "Telegram send failed" });
    }

    return res.status(200).json({ ok: true, message: "Sent to Telegram" });
  } catch (err) {
    console.error("PARTNER API ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
      details: err.message,
    });
  }
}
