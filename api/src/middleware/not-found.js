// Any /api route that no router handled.
function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = notFound;
