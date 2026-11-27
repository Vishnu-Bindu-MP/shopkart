const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { BadRequestError, ConflictError, UnauthorizedError } = require('../utils/errors');

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
const login = async (data) => {
  const { email, password } = data || {};

  if (typeof email !== 'string' || email.trim() === '') {
    throw new BadRequestError('Email is required');
  }
  if (typeof password !== 'string' || password === '') {
    throw new BadRequestError('Password is required');
  }

  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  const user = result.rows[0];

  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { token, user: { id: user.id, name: user.name, email: user.email } };
};
module.exports = { signup, login };