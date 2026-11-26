const authService = require('../services/authService');

const signup = async (req, res, next) => {
  try {
    const user = await authService.signup(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { signup };