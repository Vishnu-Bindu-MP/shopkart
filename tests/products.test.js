const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET);

jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const app = require('../app');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/products', () => {
  test('returns 200 and the list of products', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cotton Kurti' }] });

    const res = await request(app).get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/products/:id', () => {
  test('returns 400 when the id is not a number', async () => {
    const res = await request(app).get('/api/products/abc');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Product id must be a positive whole number');
  });

  test('returns 404 when the product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/products/999');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Product not found');
  });

  test('returns 200 and the product when it exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cotton Kurti' }] });

    const res = await request(app).get('/api/products/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Cotton Kurti');
  });
});

describe('POST /api/products', () => {
  test('returns 401 when no token is sent', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Mug', price: 199 });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Login required');
  });

  test('returns 400 when the name is missing', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 299 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  test('returns 400 when the price is not above 0', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mug', price: -5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Price must be a number above 0');
  });

  test('returns 201 and the new product when the data is valid', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 4, name: 'Water Bottle', price: '299.00', stock: 10 }],
    });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Water Bottle', price: 299, stock: 10 });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(4);
  });
});