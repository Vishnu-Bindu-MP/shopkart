const pool = require('../db');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const getAllProducts = async () => {
  const result = await pool.query('SELECT * FROM products ORDER BY id');
  return result.rows;
};

const getProductById = async (idInput) => {
  const id = Number(idInput);

  if (!Number.isInteger(id) || id < 1) {
    throw new BadRequestError('Product id must be a positive whole number');
  }

  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }

  return result.rows[0];
};

const createProduct = async (data) => {
  const { name, description, price, stock } = data || {};

  if (typeof name !== 'string' || name.trim() === '') {
    throw new BadRequestError('Name is required');
  }
  if (typeof price !== 'number' || price <= 0) {
    throw new BadRequestError('Price must be a number above 0');
  }
  const stockValue = stock === undefined ? 0 : stock;
  if (!Number.isInteger(stockValue) || stockValue < 0) {
    throw new BadRequestError('Stock must be a whole number, 0 or more');
  }

  const result = await pool.query(
    'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
    [name.trim(), description || null, price, stockValue]
  );

  return result.rows[0];
};

module.exports = { getAllProducts, getProductById, createProduct };