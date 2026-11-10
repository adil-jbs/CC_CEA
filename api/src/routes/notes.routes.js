// /api/notes endpoints.
const { Router } = require('express');
const controller = require('../controllers/notes.controller');
const validateId = require('../middleware/validate-id');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', validateId, controller.update);
router.delete('/:id', validateId, controller.remove);

module.exports = router;
