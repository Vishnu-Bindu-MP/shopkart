const express = require('express');
const controller = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', controller.getProducts);
router.get('/:id', controller.getProduct);
router.post('/', authenticate, controller.createProduct);

module.exports = router;