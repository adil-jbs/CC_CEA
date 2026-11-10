// Everything under /api.
const { Router } = require('express');
const health = require('./health.routes');
const notes = require('./notes.routes');
const notFound = require('../middleware/not-found');

const router = Router();

router.use('/health', health);
router.use('/notes', notes);
router.use(notFound);

module.exports = router;
