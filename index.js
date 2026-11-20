const express = require('express');
const pool = require('./db');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello! My shopping app server is running.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ connected: false });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});