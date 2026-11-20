const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello! My shopping app server is running.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});