// Health check: used by local tooling and monitoring to confirm the API is alive.
const { Router } = require('express');

const router = Router();
router.get('/', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
