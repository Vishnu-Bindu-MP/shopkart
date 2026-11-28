const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const app = require('../app');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/cart', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.statusCode).toBe(401);
  });

  test('returns 200 with the items and the total', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, product_id: 1, name: 'Cotton Kurti', price: '399.00', quantity: 2, line_total: '798.00' },
        { id: 2, product_id: 3, name: 'Steel Bottle', price: '549.00', quantity: 1, line_total: '549.00' },
      ],
    });

    const res = await request(app).get('/api/cart').set(auth);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(1347);
  });
});

describe('POST /api/cart/items', () => {
  test('returns 400 when quantity is 0', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: 1, quantity: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('quantity must be a whole number, 1 or more');
  });

  test('returns 404 when the product does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: 999, quantity: 1 });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Product not found');
  });

  test('returns 400 when there is not enough stock', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, stock: 3 }] });

    const res = await request(app)
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: 1, quantity: 5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Not enough stock');
  });

  test('returns 201 and the cart row when the request is valid', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, stock: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 7, user_id: 1, product_id: 1, quantity: 2 }] });

    const res = await request(app)
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: 1, quantity: 2 });

    expect(res.statusCode).toBe(201);
    expect(res.body.quantity).toBe(2);
  });
});

describe('PUT /api/cart/items/:productId', () => {
  test('returns 404 when the item is not in the cart', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ stock: 10 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/cart/items/1')
      .set(auth)
      .send({ quantity: 3 });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Item not in cart');
  });

  test('returns 200 and the updated row', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ stock: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 7, user_id: 1, product_id: 1, quantity: 3 }] });

    const res = await request(app)
      .put('/api/cart/items/1')
      .set(auth)
      .send({ quantity: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.quantity).toBe(3);
  });
});

describe('DELETE /api/cart/items/:productId', () => {
  test('returns 204 when the item is removed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7 }] });

    const res = await request(app).delete('/api/cart/items/1').set(auth);

    expect(res.statusCode).toBe(204);
  });

  test('returns 404 when the item is not in the cart', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/cart/items/1').set(auth);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Item not in cart');
  });

  test('returns 400 when the product id is not a number', async () => {
    const res = await request(app).delete('/api/cart/items/abc').set(auth);

    expect(res.statusCode).toBe(400);
  });
});