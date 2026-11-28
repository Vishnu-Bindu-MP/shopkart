const express = require('express');
const controller = require('../controllers/cartController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.getCart);
router.post('/items', controller.addItem);

module.exports = router;