// Last stop for every error: known errors get their own status and message;
// anything unexpected is logged on the server and returned as a generic 500,
// so internal details (hosts, SQL, stack traces) never reach the client.
const { HttpError } = require('../utils/errors');

// Express recognises an error handler by its four arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Note is too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
