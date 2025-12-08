import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';

const { Pool } = pkg;
const router = express.Router();

// Пул подключения к БД (Render + Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// === ТЕСТОВЫЙ МАРШРУТ ===
// GET https://madera-api.onrender.com/api/auth/test
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Auth API работает' });
});

// === РЕГИСТРАЦИЯ ===
// POST https://madera-api.onrender.com/api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ ok: false, error: 'Заполните все поля' });
    }

    // Проверяем, что телефон не занят
    const existing = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'Телефон уже зарегистрирован' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, phone, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, phone, hash]
    );

    res.json({ ok: true, userId: result.rows[0].id });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// === ЛОГИН ===
// POST https://madera-api.onrender.com/api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ ok: false, error: 'Заполните телефон и пароль' });
    }

    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Неверный телефон или пароль' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ ok: false, error: 'Неверный телефон или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ ok: true, token });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
