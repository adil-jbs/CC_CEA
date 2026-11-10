// Rejects ids that are not positive whole numbers before any database work.
const { NotFoundError } = require('../utils/errors');

function validateId(req, res, next) {
  if (!/^[1-9]\d{0,9}$/.test(req.params.id)) return next(new NotFoundError());
  next();
}

module.exports = validateId;
