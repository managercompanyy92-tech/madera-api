import bcrypt from 'bcryptjs';
import { pool } from '../db/db.js';

export async function register(req, res) {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password)
      return res.status(400).json({ error: 'Missing fields' });

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, phone, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [name, phone, hash]
    );

    res.json({ ok: true, userId: result.rows[0].id });

  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function login(req, res) {
  try {
    const { phone, password } = req.body;

    const user = await pool.query(
      `SELECT * FROM users WHERE phone = $1`,
      [phone]
    );

    if (user.rows.length === 0)
      return res.status(400).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isValid) return res.status(403).json({ error: 'Incorrect password' });

    res.json({ ok: true, userId: user.rows[0].id });

  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Server error' });
  }
}
