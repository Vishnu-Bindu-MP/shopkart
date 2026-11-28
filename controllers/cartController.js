const cartService = require('../services/cartService');

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

const addItem = async (req, res, next) => {
  try {
    const item = await cartService.addToCart(req.user.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addItem };