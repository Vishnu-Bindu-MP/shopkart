const express = require('express');
const controller = require('../controllers/productController');

const router = express.Router();

router.get('/', controller.getProducts);
router.get('/:id', controller.getProduct);
router.post('/', controller.createProduct);

module.exports = router;