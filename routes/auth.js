import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';

const { Pool } = pkg;
const router = express.Router();

// Пул подключений к БД (используем тот же DATABASE_URL, что и в server.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// === ТЕСТОВЫЙ МАРШРУТ ===
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Auth routes work' });
});

// === РЕГИСТРАЦИЯ ===
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, promo_code } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    const client = await pool.connect();
    try {
      // Проверяем, есть ли уже пользователь с таким телефоном
      const existing = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Телефон уже зарегистрирован' });
      }

      // Хэшируем пароль
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Создаём пользователя
      const result = await client.query(
        `INSERT INTO users (name, phone, password_hash, promo_code, is_partner)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id, name, phone, promo_code`,
        [name, phone, hash, promo_code || null]
      );

      res.json({ ok: true, user: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/auth/register error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// === ЛОГИН ===
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Неверный телефон или пароль' });
      }

      const user = result.rows[0];

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Неверный телефон или пароль' });
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'supersecret123',
        { expiresIn: '30d' }
      );

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          promo_code: user.promo_code
        }
      });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/auth/login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
