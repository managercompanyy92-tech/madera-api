import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // отключаем, чтобы принять файл
  },
};

const BOT_TOKEN = "ТВОЙ_ТОКЕН_БОТА";
const CHAT_ID = "7889419635"; // твой ID

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Метод не разрешён" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ ok: false, error: "Ошибка загрузки файла" });
    }

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
    } = fields;

    const file = files.paymentCheck;

    if (!file) {
      return res.status(400).json({ ok: false, error: "Чек не прикреплён" });
    }

    // ---------- 1. Отправляем текст ----------
    const textMessage =
      `🟧 Новая заявка на замер и расчёт:\n\n` +
      `🧑 Имя: ${name}\n` +
      `📞 Телефон: ${phone}\n` +
      `📍 Адрес: ${address}\n` +
      `🧭 Ориентир: ${landmark}\n` +
      `💬 Связь: ${contactMethod}\n` +
      `🪑 Категория: ${category}\n` +
      `📏 Длина проекта: ${length || "-"}\n` +
      `💰 Тариф: ${tariff || "-"}\n` +
      `🎟 Промокод: ${promo || "нет"}\n` +
      `🧾 Чек об оплате: прикреплён\n` +
      `📝 Описание: ${description || "-"}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: textMessage,
        parse_mode: "Markdown",
      }),
    });

    // ---------- 2. Отправляем сам файл ----------
    const fileData = fs.readFileSync(file.filepath);

    const uploadForm = new FormData();
    uploadForm.append("chat_id", CHAT_ID);
    uploadForm.append("document", new Blob([fileData]), file.originalFilename);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: uploadForm,
    });

    res.status(200).json({ ok: true });
  });
}
