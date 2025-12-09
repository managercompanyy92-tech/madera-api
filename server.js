import authRoutes from './routes/auth.js';
import partnerRoutes from "./routes/partner.js";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);
// === ПОДКЛЮЧЕНИЕ К БД ===
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// === СОЗДАНИЕ ТАБЛИЦ ПРИ ЗАПУСКЕ ===
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Пользователи (клиенты и партнёры)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        promo_code TEXT UNIQUE,
        is_partner BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Заказы
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        partner_id INTEGER REFERENCES users(id),
        promo_code TEXT,
        status_step INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Профиль клиента (расширенные данные)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        city TEXT,
        address TEXT,
        landmark TEXT,
        email TEXT,
        style TEXT,
        comment TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await client.query('COMMIT');
    console.log('DB init: tables are ready');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('DB init error:', e);
    throw e;
  } finally {
    client.release();
  }
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ===
function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// === API: Health-check ===
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// === API: Регистрация ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, password, isPartner } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Имя, телефон и пароль обязательны' });
    }

    const clean = cleanPhone(phone);
    if (!clean) {
      return res.status(400).json({ error: 'Некорректный телефон' });
    }

    const client = await pool.connect();
    try {
      const existing = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [clean]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Аккаунт с таким телефоном уже существует' });
      }

      const hash = await bcrypt.hash(password, 10);

      // Промокод для партнёра: например, MD + id (сделаем позже через UPDATE)
      const result = await client.query(
        `INSERT INTO users (name, phone, password_hash, is_partner)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, phone, is_partner, promo_code`,
        [name, clean, hash, !!isPartner]
      );

      const user = result.rows[0];

      // Если партнёр — сгенерируем ему промокод MD + id
      if (user.is_partner) {
        const code = 'MD' + String(user.id).padStart(4, '0');
        const upd = await client.query(
          `UPDATE users SET promo_code = $1 WHERE id = $2
           RETURNING id, name, phone, is_partner, promo_code`,
          [code, user.id]
        );
        return res.json({ user: upd.rows[0] });
      }

      res.json({ user });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/auth/register error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === API: Логин ===
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const clean = cleanPhone(phone);

    if (!clean || !password) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE phone = $1',
        [clean]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Аккаунт не найден' });
      }

      const user = result.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(400).json({ error: 'Неверный пароль' });
      }

      // В реальной системе тут выдаётся JWT. Сейчас просто возвращаем данные.
      delete user.password_hash;
      res.json({ user });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/auth/login error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === API: Создание заказа (клиент оформляет заказ) ===
app.post('/api/orders', async (req, res) => {
  try {
    const {
      clientName,
      clientPhone,
      promoCode
    } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({ error: 'Имя клиента и телефон обязательны' });
    }

    const cleanClientPhone = cleanPhone(clientPhone);
    const cleanPromo = promoCode ? promoCode.trim().toUpperCase() : null;

    const client = await pool.connect();
    try {
      let partnerId = null;
      let userId = null;

      if (cleanPromo) {
        const partner = await client.query(
          'SELECT id FROM users WHERE promo_code = $1',
          [cleanPromo]
        );
        if (partner.rows.length > 0) {
          partnerId = partner.rows[0].id;
        }
      }

      // Привяжем заказ к клиенту по телефону, если он уже есть
      const user = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [cleanClientPhone]
      );
      if (user.rows.length > 0) {
        userId = user.rows[0].id;
      }

      const result = await client.query(
        `INSERT INTO orders
          (client_name, client_phone, user_id, partner_id, promo_code, status_step)
         VALUES ($1, $2, $3, $4, $5, 1)
         RETURNING *`,
        [
          clientName,
          cleanClientPhone,
          userId,
          partnerId,
          cleanPromo
        ]
      );

      res.json({ order: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/orders error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === API: Список заказов партнёра по его ID ===
app.get('/api/partners/:id/orders', async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (!partnerId) {
      return res.status(400).json({ error: 'Некорректный partner id' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, client_name, client_phone, promo_code,
                status_step, created_at
           FROM orders
          WHERE partner_id = $1
          ORDER BY created_at DESC`,
        [partnerId]
      );

      const total = result.rows.length;
      res.json({ total, orders: result.rows });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/partners/:id/orders error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === API: Профиль клиента (получить) ===
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Некорректный user id' });

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT p.*, u.name, u.phone, u.promo_code, u.is_partner
           FROM profiles p
           RIGHT JOIN users u ON p.user_id = u.id
          WHERE u.id = $1`,
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Профиль не найден' });
      }
      res.json({ profile: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/profile/:userId GET error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === API: Профиль клиента (обновить/создать) ===
app.post('/api/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Некорректный user id' });

    const {
      city,
      address,
      landmark,
      email,
      style,
      comment
    } = req.body;

    const client = await pool.connect();
    try {
      const existing = await client.query(
        'SELECT id FROM profiles WHERE user_id = $1',
        [userId]
      );

      let result;
      if (existing.rows.length === 0) {
        result = await client.query(
          `INSERT INTO profiles
            (user_id, city, address, landmark, email, style, comment, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())
           RETURNING *`,
          [userId, city, address, landmark, email, style, comment]
        );
      } else {
        result = await client.query(
          `UPDATE profiles
              SET city = $2,
                  address = $3,
                  landmark = $4,
                  email = $5,
                  style = $6,
                  comment = $7,
                  updated_at = now()
            WHERE user_id = $1
            RETURNING *`,
          [userId, city, address, landmark, email, style, comment]
        );
      }

      res.json({ profile: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/profile/:userId POST error', e);
    res.status(500).json({ error: 'Server error' });
  }
});
// === ТЕСТОВЫЕ МАРШРУТЫ ДЛЯ ПРОВЕРКИ ===
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Madera API is running' });
});

app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'API работает корректно' });
});
// === ЗАПУСК СЕРВЕРА ===
const port = process.env.PORT || 3001;

initDb()
  .then(() => {
    // ========== ПАРТНЁРСКАЯ ПРОГРАММА: API ==========
//
// Этот блок делает две вещи:
// 1) Создаёт таблицу partner_requests в базе, если её ещё нет.
// 2) Добавляет маршрут POST /api/partner/apply для приёма заявок.
//
// ВАЖНО: этот код использует уже существующие переменные app и pool,
// которые объявлены выше в server.js (Express и подключение к Postgres).

// --- 1. Создание таблицы partner_requests при запуске сервера ---

async function ensurePartnerRequestsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partner_requests (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        profession TEXT,
        profile_link TEXT,
        audience TEXT,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ partner_requests table is ready');
  } catch (err) {
    console.error('❌ Error creating partner_requests table:', err);
  }
}

// Запускаем создание таблицы (один раз при старте сервера)
ensurePartnerRequestsTable();


// --- 2. Маршрут приёма заявки на партнёрство ---
//
// URL:  POST https://madera-api.onrender.com/api/partner/apply
// Body: JSON
// {
//   "name": "Имя",
//   "phone": "+992...",
//   "profession": "Дизайнер / блогер / ...",
//   "profileLink": "https://instagram.com/...",
//   "audience": "Кратко об аудитории"
// }

app.post('/api/partner/apply', async (req, res) => {
  try {
    const { name, phone, profession, profileLink, audience } = req.body || {};

    // Простая валидация
    if (!name || !phone) {
      return res.status(400).json({
        ok: false,
        error: 'Укажите имя и телефон',
      });
    }

    // Сохраняем заявку в базу
    const result = await pool.query(
      `
        INSERT INTO partner_requests
          (name, phone, profession, profile_link, audience)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        name,
        phone,
        profession || null,
        profileLink || null,
        audience || null,
      ],
    );

    const requestId = result.rows[0]?.id;

    return res.json({
      ok: true,
      requestId,
      message: 'Заявка на партнёрство принята',
    });
  } catch (err) {
    console.error('❌ PARTNER_APPLY_ERROR:', err);
    return res.status(500).json({
      ok: false,
      error: 'Ошибка сервера при отправке заявки',
    });
  }
});

// ========== КОНЕЦ БЛОКА ПАРТНЁРСКОЙ ПРОГРАММЫ ==========
    app.listen(port, () => {
      console.log('API server listening on port', port);
    });
  })
  .catch((e) => {
    console.error('Fatal DB init error', e);
    process.exit(1);
  });
