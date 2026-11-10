// Turns HTTP requests into service calls and service results into HTTP responses.
// Express 5 forwards rejected promises to the error handler automatically.
const service = require('../services/notes.service');

async function list(req, res) {
  res.json(await service.listNotes());
}

async function create(req, res) {
  res.status(201).json(await service.createNote(req.body));
}

async function update(req, res) {
  res.json(await service.updateNote(req.params.id, req.body));
}

async function remove(req, res) {
  await service.deleteNote(req.params.id);
  res.status(204).end();
}

module.exports = { list, create, update, remove };
