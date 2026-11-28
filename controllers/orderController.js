const orderService = require('../services/orderService');

const checkout = async (req, res, next) => {
  try {
    const order = await orderService.checkout(req.user.id);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};
const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.user.id, req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
};
module.exports = { checkout, getOrders, getOrder };