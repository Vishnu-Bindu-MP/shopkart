const pool = require('../db');
const cartService = require('./cartService');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const round2 = (n) => Math.round(n * 100) / 100;

const calculateDiscount = (promo, subtotal, now = new Date()) => {
  if (!promo || promo.is_deleted) {
    throw new NotFoundError('Promo code not found');
  }
  if (promo.valid_from && now < new Date(promo.valid_from)) {
    throw new BadRequestError('Promo code is not yet valid');
  }
  if (promo.valid_to && now > new Date(promo.valid_to)) {
    throw new BadRequestError('Promo code has expired');
  }
  if (promo.max_uses != null && promo.current_uses >= promo.max_uses) {
    throw new BadRequestError('Promo code usage limit reached');
  }
  if (promo.min_order_amount != null && subtotal < Number(promo.min_order_amount)) {
    throw new BadRequestError(`Minimum order of ${promo.min_order_amount} required for this promo code`);
  }

  const value = Number(promo.discount_value);
  const raw = promo.discount_type === 'percentage' ? (subtotal * value) / 100 : value;

  return round2(Math.min(raw, subtotal));
};

const previewPromo = async (userId, codeInput) => {
  if (typeof codeInput !== 'string' || codeInput.trim() === '') {
    throw new BadRequestError('Promo code is required');
  }

  const cart = await cartService.getCart(userId);
  if (cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }

  const code = codeInput.trim().toUpperCase();
  const result = await pool.query('SELECT * FROM promo_codes WHERE code = $1', [code]);

  const discount = calculateDiscount(result.rows[0], cart.total);

  return {
    code,
    subtotal: cart.total,
    discount,
    total: round2(Math.max(0, cart.total - discount)),
  };
};

module.exports = { calculateDiscount, previewPromo };