// Business rules for notes: validation and what each operation means.
const repo = require('../repositories/notes.repository');
const { notes: limits } = require('../config');
const { ValidationError, NotFoundError } = require('../utils/errors');

// The only columns a client may change (also guards the UPDATE statement).
const FIELDS = ['title', 'body', 'color', 'pinned'];

// For a new note (partial = false) a title or some text is required.
// For an update (partial = true) only the fields that are sent are checked.
// Returns an error message, or null if the input is valid.
function validateNote(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'request body must be a JSON object';
  const { title, body, color, pinned } = input;
  if (title !== undefined && (typeof title !== 'string' || title.trim().length > limits.titleMax))
    return `title must be text (max ${limits.titleMax} characters)`;
  if (body !== undefined && (typeof body !== 'string' || body.length > limits.bodyMax))
    return `body must be text (max ${limits.bodyMax} characters)`;
  if (color !== undefined && !limits.colors.includes(color))
    return `color must be one of: ${limits.colors.join(', ')}`;
  if (pinned !== undefined && typeof pinned !== 'boolean')
    return 'pinned must be true or false';
  if (partial) {
    if (!FIELDS.some((f) => input[f] !== undefined)) return `send at least one of: ${FIELDS.join(', ')}`;
  } else if (!(title || '').trim() && !(body || '').trim()) {
    return 'a note needs a title or some text';
  }
  return null;
}

function listNotes() {
  return repo.list();
}

async function createNote(input) {
  const error = validateNote(input);
  if (error) throw new ValidationError(error);
  const { title = '', body = '', color = 'yellow', pinned = false } = input;
  const id = await repo.create({ title: title.trim(), body, color, pinned });
  return repo.findById(id);
}

async function updateNote(id, input) {
  const error = validateNote(input, { partial: true });
  if (error) throw new ValidationError(error);
  const changes = {};
  for (const f of FIELDS) {
    if (input[f] !== undefined) changes[f] = f === 'title' ? input.title.trim() : input[f];
  }
  if (!(await repo.update(id, changes))) throw new NotFoundError();
  return repo.findById(id);
}

async function deleteNote(id) {
  if (!(await repo.remove(id))) throw new NotFoundError();
}

module.exports = { validateNote, listNotes, createNote, updateNote, deleteNote, COLORS: limits.colors };
