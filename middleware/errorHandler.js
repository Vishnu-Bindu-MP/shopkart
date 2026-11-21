const errorHandler = (err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};

module.exports = errorHandler;