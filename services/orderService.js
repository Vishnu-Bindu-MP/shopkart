const pool = require('../db');
const { calculateDiscount } = require('./promoService');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const round2 = (n) => Math.round(n * 100) / 100;

const checkout = async (userId, promoCodeInput) => {
  const hasPromo = promoCodeInput !== undefined && promoCodeInput !== null;
  if (hasPromo && (typeof promoCodeInput !== 'string' || promoCodeInput.trim() === '')) {
    throw new BadRequestError('Promo code must be a non-empty text');
  }
  const promoCode = hasPromo ? promoCodeInput.trim().toUpperCase() : null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cart = await client.query(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.stock
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.product_id
       FOR UPDATE OF p`,
      [userId]
    );

    if (cart.rows.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    for (const item of cart.rows) {
      if (item.quantity > item.stock) {
        throw new BadRequestError(`Not enough stock for ${item.name}`);
      }
    }

    const subtotal = round2(
      cart.rows.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
    );

    let discount = 0;
    if (promoCode) {
      const promoResult = await client.query(
        'SELECT * FROM promo_codes WHERE code = $1 FOR UPDATE',
        [promoCode]
      );
      const promo = promoResult.rows[0];

      discount = calculateDiscount(promo, subtotal);

      await client.query(
        'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
        [promo.id]
      );
    }

    const total = round2(subtotal - discount);

    const order = await client.query(
      'INSERT INTO orders (user_id, total, discount, promo_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, total.toFixed(2), discount.toFixed(2), promoCode]
    );
    const orderId = order.rows[0].id;

    for (const item of cart.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    return {
      ...order.rows[0],
      items: cart.rows.map((item) => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getOrders = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [userId]
  );
  return result.rows;
};

const getOrderById = async (userId, idInput) => {
  const id = Number(idInput);
  if (!Number.isInteger(id) || id < 1) {
    throw new BadRequestError('Order id must be a positive whole number');
  }

  const order = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (order.rows.length === 0) {
    throw new NotFoundError('Order not found');
  }

  const items = await pool.query(
    `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [id]
  );

  return { ...order.rows[0], items: items.rows };
};

module.exports = { checkout, getOrders, getOrderById };