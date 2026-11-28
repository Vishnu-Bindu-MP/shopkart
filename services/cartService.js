const pool = require('../db');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const getCart = async (userId) => {
  const result = await pool.query(
    `SELECT c.id, c.product_id, p.name, p.price, c.quantity,
            p.price * c.quantity AS line_total
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = $1
     ORDER BY c.id`,
    [userId]
  );

  const items = result.rows;
  const total = items.reduce((sum, item) => sum + Number(item.line_total), 0);

  return { items, total: Number(total.toFixed(2)) };
};

const addToCart = async (userId, data) => {
  const { productId, quantity = 1 } = data || {};

  if (!Number.isInteger(productId) || productId < 1) {
    throw new BadRequestError('productId must be a positive whole number');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BadRequestError('quantity must be a whole number, 1 or more');
  }

  const product = await pool.query('SELECT id, stock FROM products WHERE id = $1', [productId]);
  if (product.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }
  if (quantity > product.rows[0].stock) {
    throw new BadRequestError('Not enough stock');
  }

  const result = await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING *`,
    [userId, productId, quantity]
  );

  return result.rows[0];
};
const parseProductId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new BadRequestError('productId must be a positive whole number');
  }
  return id;
};

const updateQuantity = async (userId, productIdInput, data) => {
  const productId = parseProductId(productIdInput);
  const { quantity } = data || {};

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BadRequestError('quantity must be a whole number, 1 or more');
  }

  const product = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
  if (product.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }
  if (quantity > product.rows[0].stock) {
    throw new BadRequestError('Not enough stock');
  }

  const result = await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *',
    [quantity, userId, productId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Item not in cart');
  }

  return result.rows[0];
};

const removeFromCart = async (userId, productIdInput) => {
  const productId = parseProductId(productIdInput);

  const result = await pool.query(
    'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING id',
    [userId, productId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Item not in cart');
  }
};
module.exports = { getCart, addToCart, updateQuantity, removeFromCart };