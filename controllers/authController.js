// controllers/authController.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/db.js';

// === РЕГИСТРАЦИЯ КЛИЕНТА ===
export async function register(req, res) {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Имя, телефон и пароль обязательны' });
    }

    // Проверяем, нет ли уже пользователя с таким телефоном
    const exist = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (exist.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким телефоном уже существует' });
    }

    // Хэшируем пароль
    const hash = await bcrypt.hash(password, 10);

    // ВАЖНО: колонка в БД называется password_hash
    const result = await pool.query(
      `INSERT INTO users (name, phone, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name, phone`,
      [name, phone, hash]
    );

    res.json({
      ok: true,
      user: result.rows[0]
    });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
}

// === ЛОГИН ===
export async function login(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];

    // сверяем пароль с password_hash
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    // создаём JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
}
