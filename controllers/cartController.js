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
const updateItem = async (req, res, next) => {
  try {
    const item = await cartService.updateQuantity(req.user.id, req.params.productId, req.body);
    res.json(item);
  } catch (err) {
    next(err);
  }
};

const removeItem = async (req, res, next) => {
  try {
    await cartService.removeFromCart(req.user.id, req.params.productId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
module.exports = { getCart, addItem, updateItem, removeItem };