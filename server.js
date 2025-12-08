// server.js
// ПРОСТОЙ API-СЕРВЕР ДЛЯ РЕГИСТРАЦИИ, ЛОГИНА И ЗАКАЗОВ
// Node 18+, Express 4

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;

// !! ЗАМЕНИ на свои параметры БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// !! ЗАМЕНИ на свой секрет
const JWT_SECRET = process.env.JWT_SECRET || 'very-secret-key';

const app = express();
app.use(cors());
app.use(express.json());

// -------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ --------

async function query(q, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(q, params);
    return res.rows;
  } finally {
    client.release();
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, promo_code: user.promo_code },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'NO_TOKEN' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'BAD_TOKEN' });
  }
}

// -------- АВТОРИЗАЦИЯ --------

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password } = req.body || {};
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'REQUIRED_FIELDS' });
  }

  const existing = await query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );
  if (existing.length) {
    return res.status(409).json({ error: 'PHONE_EXISTS' });
  }

  const hash = await bcrypt.hash(password, 10);

  // промокод = номер телефона, можно поменять логику
  const promoCode = phone;

  const rows = await query(
    `INSERT INTO users(name, phone, password_hash, promo_code)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, phone, promo_code`,
    [name, phone, hash, promoCode]
  );

  const user = rows[0];
  const token = signToken(user);
  res.json({ token, user });
});

// Логин
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ error: 'REQUIRED_FIELDS' });
  }

  const rows = await query(
    'SELECT id, name, phone, password_hash, promo_code FROM users WHERE phone = $1',
    [phone]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'NOT_FOUND' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'BAD_CREDENTIALS' });

  const token = signToken(user);
  delete user.password_hash;
  res.json({ token, user });
});

// -------- ЗАКАЗЫ --------

// Создать заказ (клиент оформляет заказ, может указать промокод)
app.post('/api/orders', async (req, res) => {
  const { clientName, phone, promoCode } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'PHONE_REQUIRED' });

  // найдём клиента-пользователя по телефону
  const userRows = await query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );
  const userId = userRows[0]?.id || null;

  // найдём партнёра по промокоду (если есть)
  let partnerId = null;
  if (promoCode) {
    const partnerRows = await query(
      'SELECT id FROM users WHERE promo_code = $1',
      [promoCode]
    );
    partnerId = partnerRows[0]?.id || null;
  }

  const rows = await query(
    `INSERT INTO orders(client_name, client_phone, user_id, partner_id, promo_code, status_step)
     VALUES ($1, $2, $3, $4, $5, 1)
     RETURNING id, client_name, client_phone, status_step, promo_code, created_at`,
    [clientName || 'Клиент', phone, userId, partnerId, promoCode || null]
  );

  res.json(rows[0]);
});

// Мои заказы (для авторизованного пользователя)
app.get('/api/orders/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const rows = await query(
    `SELECT id, client_name, client_phone, status_step, promo_code, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  res.json(rows);
});

// Обновить статус заказа (админ/менеджер, здесь без роли – всё равно защищено токеном)
app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  const id = +req.params.id;
  const { statusStep } = req.body || {};
  if (!statusStep || statusStep < 1 || statusStep > 10) {
    return res.status(400).json({ error: 'BAD_STATUS' });
  }

  const rows = await query(
    `UPDATE orders
     SET status_step = $1
     WHERE id = $2
     RETURNING id, client_name, client_phone, status_step, promo_code, created_at`,
    [statusStep, id]
  );

  if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(rows[0]);
});

// -------- СТАТИСТИКА ПАРТНЁРА --------

// Заказы по моему промокоду (для залогиненного партнёра)
app.get('/api/partner/stats', authMiddleware, async (req, res) => {
  const partnerId = req.user.id;

  const rows = await query(
    `SELECT id, client_name, client_phone, status_step, promo_code, created_at
     FROM orders
     WHERE partner_id = $1
     ORDER BY created_at DESC`,
    [partnerId]
  );

  const total = rows.length;
  res.json({ total, orders: rows });
});

// health-check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log('API server listening on port', port);
});
