const express = require('express');
const controller = require('../controllers/orderController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/', controller.checkout);
router.get('/', controller.getOrders);
router.get('/:id', controller.getOrder);
module.exports = router;