const express = require('express');
const controller = require('../controllers/cartController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.getCart);
router.post('/items', controller.addItem);
router.put('/items/:productId', controller.updateItem);
router.delete('/items/:productId', controller.removeItem);
router.post('/promo', controller.applyPromo);
module.exports = router;