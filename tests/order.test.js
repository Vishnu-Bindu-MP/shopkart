const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../db');
const app = require('../app');

let client;

beforeEach(() => {
  pool.query.mockReset();
  pool.connect.mockReset();
  client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

describe('POST /api/orders (checkout)', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).post('/api/orders');

    expect(res.statusCode).toBe(401);
  });

  test('returns 400 and rolls back when the cart is empty', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/orders').set(auth);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cart is empty');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('returns 400 and rolls back when stock is too low', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 5, name: 'Cotton Kurti', price: '399.00', stock: 2 }],
      });

    const res = await request(app).post('/api/orders').set(auth);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Not enough stock for Cotton Kurti');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('returns 201 and commits when checkout succeeds', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 3, name: 'Cotton Kurti', price: '399.00', stock: 22 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, total: '1197.00', status: 'placed' }],
      });

    const res = await request(app).post('/api/orders').set(auth);

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('POST /api/orders with a promo code', () => {
  const cartRows = {
    rows: [{ product_id: 1, quantity: 3, name: 'Cotton Kurti', price: '399.00', stock: 22 }],
  };

  const promo = {
    id: 7,
    code: 'SAVE10',
    discount_type: 'percentage',
    discount_value: '10.00',
    min_order_amount: '500.00',
    valid_from: null,
    valid_to: null,
    max_uses: null,
    current_uses: 0,
    is_deleted: false,
  };

  test('returns 400 when the promo code is not text', async () => {
    const res = await request(app).post('/api/orders').set(auth).send({ promoCode: 123 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Promo code must be a non-empty text');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('returns 404 and rolls back when the code does not exist', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(cartRows)
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/orders').set(auth).send({ promoCode: 'NOPE' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Promo code not found');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('returns 400 and rolls back when the code has expired', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(cartRows)
      .mockResolvedValueOnce({ rows: [{ ...promo, valid_to: '2020-01-01T00:00:00Z' }] });

    const res = await request(app).post('/api/orders').set(auth).send({ promoCode: 'SAVE10' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Promo code has expired');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('returns 400 when the usage limit is reached', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(cartRows)
      .mockResolvedValueOnce({ rows: [{ ...promo, max_uses: 5, current_uses: 5 }] });

    const res = await request(app).post('/api/orders').set(auth).send({ promoCode: 'SAVE10' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Promo code usage limit reached');
  });

  test('returns 201, saves the discount and uses up one promo use', async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(cartRows)
      .mockResolvedValueOnce({ rows: [promo] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, total: '1077.30', discount: '119.70', promo_code: 'SAVE10' }],
      });

    const res = await request(app).post('/api/orders').set(auth).send({ promoCode: 'save10' });

    expect(res.statusCode).toBe(201);
    expect(res.body.promo_code).toBe('SAVE10');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orders'),
      [1, '1077.30', '119.70', 'SAVE10']
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE promo_codes'),
      [7]
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('GET /api/orders', () => {
  test('returns 200 and the list of orders', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, total: '1197.00' }] });

    const res = await request(app).get('/api/orders').set(auth);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/orders/:id', () => {
  test('returns 400 when the id is not a number', async () => {
    const res = await request(app).get('/api/orders/abc').set(auth);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Order id must be a positive whole number');
  });

  test('returns 404 when the order does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/orders/999').set(auth);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  test('returns 200 with the order and its items', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, total: '1197.00' }] })
      .mockResolvedValueOnce({
        rows: [{ product_id: 1, name: 'Cotton Kurti', quantity: 3, unit_price: '399.00' }],
      });

    const res = await request(app).get('/api/orders/1').set(auth);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});