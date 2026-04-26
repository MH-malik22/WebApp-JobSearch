import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';

export const credentials = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(200),
});

export async function registerUser({ email, password }) {
  const password_hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, created_at`,
    [email, password_hash]
  );
  if (rows.length === 0) {
    const err = new Error('email already registered');
    err.status = 409;
    err.code = 'email_taken';
    throw err;
  }
  return rows[0];
}

export async function authenticate({ email, password }) {
  const { rows } = await query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email, created_at: user.created_at };
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export async function findUserById(id) {
  const { rows } = await query(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}
