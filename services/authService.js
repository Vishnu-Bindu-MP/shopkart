const bcrypt = require('bcryptjs');
const pool = require('../db');
const { BadRequestError, ConflictError } = require('../utils/errors');

const signup = async (data) => {
  const { name, email, password } = data || {};

  if (typeof name !== 'string' || name.trim() === '') {
    throw new BadRequestError('Name is required');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new BadRequestError('A valid email is required');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters');
  }

  const cleanEmail = email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
    [name.trim(), cleanEmail, passwordHash]
  );

  return result.rows[0];
};

module.exports = { signup };