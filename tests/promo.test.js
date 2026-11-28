const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

jest.mock('../db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../db');
const app = require('../app');
const { calculateDiscount } = require('../services/promoService');

const now = new Date('2026-12-01T00:00:00Z');

const basePromo = {
  code: 'SAVE10',
  discount_type: 'percentage',
  discount_value: '10.00',
  min_order_amount: null,
  valid_from: null,
  valid_to: null,
  max_uses: null,
  current_uses: 0,
  is_deleted: false,
};

describe('calculateDiscount rules', () => {
  test('throws not found when the promo is missing', () => {
    expect(() => calculateDiscount(undefined, 1000, now)).toThrow('Promo code not found');
  });

  test('throws not found when the promo is soft-deleted', () => {
    expect(() => calculateDiscount({ ...basePromo, is_deleted: true }, 1000, now)).toThrow('Promo code not found');
  });

  test('throws when the promo is not yet valid', () => {
    const promo = { ...basePromo, valid_from: '2027-01-01T00:00:00Z' };
    expect(() => calculateDiscount(promo, 1000, now)).toThrow('Promo code is not yet valid');
  });

  test('throws when the promo has expired', () => {
    const promo = { ...basePromo, valid_to: '2026-11-01T00:00:00Z' };
    expect(() => calculateDiscount(promo, 1000, now)).toThrow('Promo code has expired');
  });

  test('throws when the usage limit is reached', () => {
    const promo = { ...basePromo, max_uses: 5, current_uses: 5 };
    expect(() => calculateDiscount(promo, 1000, now)).toThrow('Promo code usage limit reached');
  });

  test('throws when the minimum order is not met', () => {
    const promo = { ...basePromo, min_order_amount: '500.00' };
    expect(() => calculateDiscount(promo, 400, now)).toThrow('Minimum order of 500.00 required for this promo code');
  });

  test('calculates a percentage discount', () => {
    expect(calculateDiscount(basePromo, 800, now)).toBe(80);
  });

  test('calculates a fixed discount', () => {
    const promo = { ...basePromo, discount_type: 'fixed', discount_value: '100.00' };
    expect(calculateDiscount(promo, 800, now)).toBe(100);
  });

  test('never discounts more than the subtotal', () => {
    const promo = { ...basePromo, discount_type: 'fixed', discount_value: '500.00' };
    expect(calculateDiscount(promo, 300, now)).toBe(300);
  });

  test('rounds to 2 decimal places', () => {
    const promo = { ...basePromo, discount_value: '15.00' };
    expect(calculateDiscount(promo, 99.99, now)).toBe(15);
  });
});

describe('POST /api/cart/promo', () => {
  const cartRows = {
    rows: [
      { id: 1, product_id: 1, name: 'Cotton Kurti', price: '399.00', quantity: 2, line_total: '798.00' },
    ],
  };

  beforeEach(() => {
    pool.query.mockReset();
  });

  test('returns 401 without a token', async () => {
    const res = await request(app).post('/api/cart/promo').send({ code: 'SAVE10' });

    expect(res.statusCode).toBe(401);
  });

  test('returns 400 when the code is missing', async () => {
    const res = await request(app).post('/api/cart/promo').set(auth).send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Promo code is required');
  });

  test('returns 400 when the cart is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/cart/promo').set(auth).send({ code: 'SAVE10' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cart is empty');
  });

  test('returns 404 when the code does not exist', async () => {
    pool.query.mockResolvedValueOnce(cartRows).mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/cart/promo').set(auth).send({ code: 'NOPE' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Promo code not found');
  });

  test('returns 200 with the discount and the new total', async () => {
    pool.query
      .mockResolvedValueOnce(cartRows)
      .mockResolvedValueOnce({ rows: [{ ...basePromo, min_order_amount: '500.00' }] });

    const res = await request(app).post('/api/cart/promo').set(auth).send({ code: 'SAVE10' });

    expect(res.statusCode).toBe(200);
    expect(res.body.subtotal).toBe(798);
    expect(res.body.discount).toBe(79.8);
    expect(res.body.total).toBe(718.2);
  });

  test('looks the code up in upper case', async () => {
    pool.query.mockResolvedValueOnce(cartRows).mockResolvedValueOnce({ rows: [basePromo] });

    await request(app).post('/api/cart/promo').set(auth).send({ code: ' save10 ' });

    expect(pool.query).toHaveBeenLastCalledWith(expect.any(String), ['SAVE10']);
  });
});