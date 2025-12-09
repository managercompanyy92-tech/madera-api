// routes/partner.js

import express from "express";
import pkg from "pg";

const router = express.Router();
const { Client } = pkg;

// универсальная функция подключения к БД
async function runDb(query, params = []) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const result = await client.query(query, params);
  await client.end();

  return result;
}

// POST /api/partner/submit — сохранить заявку
router.post("/submit", async (req, res) => {
  try {
    const { name, phone, activity, profileLink, about } = req.body;

    const result = await runDb(
      `INSERT INTO partner_requests (name, phone, activity, profile_link, about)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, phone, activity, profileLink, about]
    );

    res.json({
      ok: true,
      requestId: result.rows[0].id,
      message: "Заявка на партнёрство успешно отправлена"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: "Ошибка сервера"
    });
  }
});

// GET /api/partner/all — получить все заявки
router.get("/all", async (req, res) => {
  try {
    const result = await runDb(`SELECT * FROM partner_requests ORDER BY id DESC`);

    res.json({
      ok: true,
      items: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: "Ошибка сервера"
    });
  }
});

export default router;
